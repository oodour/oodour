import { lstatSync, readdirSync, readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, isAbsolute, join, normalize, sep } from 'node:path';
import { localPath, namesNetworkPath } from './below.ts';

export type ConfigReader = (file: string) => string;

const mostIncludes = 10;

const refuse = (reason: string): never => {
  throw new Error(`git: ${reason}`);
};

// Not `resolve`, which would take a `..` by its text only; readingsOf takes it both ways.
const from = (base: string, name: string): string => (isAbsolute(name) ? name : `${base}${sep}${name}`);

// Git opens the files its metadata names, wherever they are, and on Windows opening \\host\share sends the user's
// credentials to that host. So the metadata is read here first, without git, and a network path in it refuses the
// repository.
export function assertLocalMetadata(folder: string, readConfig: ConfigReader): void {
  const real = localPath(folder) ?? refuse(`${folder} is a network or device path, or leads to one`);
  // The top of the work tree, which Git reads a relative path in the config from, holds the folder.
  const workTreeTops = foldersUpFrom(real);

  // Git takes the first git folder on the way up that it accepts as one, and its rules for that have more corners
  // than a copy of them would keep up with. So every folder it could take is checked.
  for (const gitFolder of workTreeTops.flatMap(gitFoldersIn)) {
    assertLocalRepository(gitFolder, workTreeTops, readConfig);
  }
}

const foldersUpFrom = (folder: string): readonly string[] =>
  dirname(folder) === folder ? [folder] : [folder, ...foldersUpFrom(dirname(folder))];

function assertLocalRepository(gitFolder: string, workTreeTops: readonly string[], readConfig: ConfigReader): void {
  const commondir =
    localPath(join(gitFolder, 'commondir')) ?? refuse(`${join(gitFolder, 'commondir')} leads to a network path`);
  const pointed =
    lstatSync(commondir, { throwIfNoEntry: false })?.isFile() === true
      ? pointedFolders(commondir, commondirOf, gitFolder)
      : [];
  const commonFolders = pointed.length === 0 ? [gitFolder] : pointed;
  const check = { readConfig, places: [...workTreeTops, gitFolder, ...commonFolders] };

  for (const commonFolder of commonFolders) {
    assertLocalConfig(join(commonFolder, 'config'), check);
  }

  assertLocalConfig(join(gitFolder, 'config.worktree'), check);

  const walked = new Set<string>();

  for (const metadataFolder of [gitFolder, ...commonFolders]) {
    assertLocalLinks(metadataFolder, walked);
  }

  for (const commonFolder of commonFolders) {
    assertLocalAlternates(join(commonFolder, 'objects'), walked);
  }
}

// Git reads borrowed objects from the folders an alternates file names, each line a path from the objects folder, and
// follows their own alternates files up to this deep.
const mostAlternates = 5;

function assertLocalAlternates(objects: string, walked: Set<string>, depth = 0): void {
  for (const file of [join(objects, 'info', 'alternates'), join(objects, 'info', 'http-alternates')]) {
    const local = localPath(file) ?? refuse(`${file} leads to a network path`);

    if (lstatSync(local, { throwIfNoEntry: false })?.isFile() !== true) {
      continue;
    }

    for (const line of readFileSync(local, 'utf8').split(/\r?\n/).filter((line) => line !== '')) {
      const refusal = `${file} names a network path (${line})`;
      const lent = namesNetworkPath(line) ? refuse(refusal) : readingsOf(from(objects, line), refusal);

      for (const reading of depth < mostAlternates ? lent : []) {
        assertLocalLinks(reading, walked);
        assertLocalAlternates(reading, walked, depth + 1);
      }
    }
  }
}

// readdirSync with `recursive` goes through links, so the folders are walked one at a time, a link is only read, and
// the local folder a link leads to is walked in turn, once.
function assertLocalLinks(folder: string, walked: Set<string>): void {
  if (walked.has(folder) || lstatSync(folder, { throwIfNoEntry: false })?.isDirectory() !== true) {
    return;
  }

  walked.add(folder);

  for (const entry of readdirSync(folder, { withFileTypes: true })) {
    const path = join(folder, entry.name);

    if (entry.isSymbolicLink()) {
      assertLocalLinks(localPath(path) ?? refuse(`${path} leads to a network path`), walked);
    } else if (entry.isDirectory()) {
      assertLocalLinks(path, walked);
    }
  }
}

// The folder's .git, then the folder itself as a bare repository.
function gitFoldersIn(folder: string): readonly string[] {
  const has = (name: string): boolean => lstatSync(join(folder, name), { throwIfNoEntry: false }) !== undefined;
  const bare = has('HEAD') && (has('commondir') || (has('objects') && has('refs'))) ? [folder] : [];

  return [...dotGitFolders(folder), ...bare];
}

// A .git folder by its name too: Git reads the relative names in it from there.
function dotGitFolders(folder: string): readonly string[] {
  const named = join(folder, '.git');
  const dotGit = localPath(named) ?? refuse(`${named} leads to a network path`);
  const entry = lstatSync(dotGit, { throwIfNoEntry: false });

  if (entry?.isFile() === true) {
    return pointedFolders(dotGit, gitdirOf, folder);
  }

  return entry === undefined ? [] : [...new Set([named, dotGit])];
}

// Git reads all of a .git file after `gitdir: `, less the spaces and line ends at its end, and all of a commondir file
// less the line ends at its end.
const gitdirOf = (text: string): string | undefined =>
  text.startsWith('gitdir: ') ? text.slice('gitdir: '.length).replace(/[ \t\n\r]+$/, '') : undefined;
const commondirOf = (text: string): string => text.replace(/[\r\n]+$/, '');

// A file such as .git or commondir that names another folder; a relative name is read from `base`.
function pointedFolders(file: string, nameIn: (text: string) => string | undefined, base: string): readonly string[] {
  const named = nameIn(readFileSync(file, 'utf8'));

  if (named === undefined) {
    return [];
  }

  if (namesNetworkPath(named)) {
    refuse(`${file} points to a network path (${named})`);
  }

  return [...readingsOf(from(base, named), `${file} points to a path that leads to a network path (${named})`)];
}

// The system Git runs on takes a `..` by its text or after following the links before it, depending on the platform
// and the call, so a path is read both ways.
function readingsOf(path: string, refusal = `${path} leads to a network path`): ReadonlySet<string> {
  return new Set([path, normalize(path)].map((reading) => localPath(reading) ?? refuse(refusal)));
}

const leadsToNetwork = (path: string): boolean =>
  [path, normalize(path)].some((reading) => localPath(reading) === undefined);

// Which values Git reads as paths, and from where, depends on the key and the command; every value is checked as a
// path from every folder Git could read it from.
interface ConfigCheck {
  readonly readConfig: ConfigReader;
  readonly places: readonly string[];
}

function assertLocalConfig(file: string, check: ConfigCheck, depth = 0): void {
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
    const newline = entry.indexOf('\n');
    const key = newline === -1 ? entry : entry.slice(0, newline);
    const value = newline === -1 ? '' : entry.slice(newline + 1);
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

      if ((fromHome ? [homedir()] : check.places).some((place) => leadsToNetwork(from(place, name)))) {
        refuse(`${key} in ${local} leads to a network path (${value})`);
      }

      // Git reads a relative include from the folder of the config file as it named it, before any link.
      if (key === 'include.path' || /^includeif\..+\.path$/.test(key)) {
        for (const base of fromHome ? [homedir()] : new Set([dirname(file), dirname(local)])) {
          assertLocalConfig(from(base, name), check, depth + 1);
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
