import { lstatSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, normalize } from 'node:path';
import { namesNetworkPath } from './below.ts';
import { from, pathsFrom, readingsOf, refuse } from './metadata-paths.ts';

export type ConfigReader = (file: string) => string;

const mostIncludes = 10;

// Which values Git reads as paths, and from where, depends on the key and the command; every value is checked as a
// path from every folder Git could read it from.
export interface ConfigCheck {
  readonly readConfig: ConfigReader;
  readonly local: (path: string) => string | undefined;
  readonly places: readonly string[];
}

export function assertLocalConfig(file: string, check: ConfigCheck, depth = 0): void {
  for (const local of readingsOf(file)) {
    if (lstatSync(local, { throwIfNoEntry: false }) !== undefined) {
      assertLocalConfigReading(file, local, check, depth);
    }
  }
}

function assertLocalConfigReading(file: string, local: string, check: ConfigCheck, depth: number): void {
  if (depth > mostIncludes) {
    refuse(`${file} is included more than ${String(mostIncludes)} deep`);
  }

  // `git config --list -z` writes each entry as its key, a newline and its value (none for a bare key), then a NUL.
  for (const entry of check.readConfig(local).split('\0')) {
    const key = entry.replace(/\n.*/s, '');
    const value = entry.slice(key.length + 1);

    // Git reaches no remote here (GIT_ALLOW_PROTOCOL=none, no lazy fetch), so a remote may live anywhere.
    if (/^remote\..+\.(?:url|pushurl)$/.test(key)) {
      continue;
    }

    for (const path of pathsIn(value)) {
      const fromHome = path.startsWith('~/');
      const name = fromHome ? path.slice(2) : path;

      if (namesNetworkPath(path)) {
        refuse(`${key} in ${local} names a network path (${value})`);
      }

      const leadsToNetwork = (reading: string): boolean => check.local(reading) === undefined;
      const readings = (fromHome ? [homedir()] : check.places).flatMap((place) => from(place, name));

      if (readings.flatMap((reading) => [reading, normalize(reading)]).some(leadsToNetwork)) {
        refuse(`${key} in ${local} leads to a network path (${value})`);
      }

      // Git reads a relative include from the folder of the config file as it named it, before any link, and one
      // named from its drive from the folder Git runs in.
      if (key === 'include.path' || /^includeif\..+\.path$/.test(key)) {
        const folders = fromHome ? [homedir()] : [dirname(file), dirname(local)];

        for (const included of new Set(folders.flatMap((base) => pathsFrom(base, name, check.places)))) {
          assertLocalConfig(included, check, depth + 1);
        }
      }
    }
  }
}

// Git reads some values as a path only after a prefix: `:(optional)`, `%(prefix)/`, or a format such as `files://`.
function pathsIn(value: string): ReadonlySet<string> {
  const required = value.replace(/^:\(optional\)/, '');
  const unprefixed = required.replace(/^%\(prefix\)\//, '');

  return new Set([value, required, unprefixed, unprefixed.replace(/^[a-z][a-z0-9+.-]*:\/\//i, '')]);
}
