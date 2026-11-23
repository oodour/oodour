import { lstatSync, readlinkSync } from 'node:fs';
import { dirname, isAbsolute, join, relative, resolve, sep } from 'node:path';

export type Place = 'direct' | 'linked';

const mostLinks = 40;

// Links are followed by reading them, never by opening their targets: on Windows, opening a link to \\host\share
// sends the user's credentials to that host.
export function placeBelow(root: string): (path: string) => Place | undefined {
  const targets = new Map<string, string | undefined>();
  const linkTarget = (path: string): string | undefined => {
    if (!targets.has(path)) {
      targets.set(path, readLink(path));
    }

    return targets.get(path);
  };
  const segmentsBelow = (path: string): readonly string[] | undefined => {
    const below = relative(root, resolve(root, path));

    return below.startsWith('..') || isAbsolute(below) ? undefined : below.split(sep).filter((segment) => segment !== '');
  };
  const walk = (segments: readonly string[], links: number): Place | undefined => {
    let current = root;

    for (const [index, segment] of segments.entries()) {
      current = join(current, segment);
      const target = linkTarget(current);

      if (target !== undefined) {
        const next = segmentsBelow(join(target, ...segments.slice(index + 1)));

        return next === undefined || links === mostLinks ? undefined : walk(next, links + 1);
      }
    }

    return links === 0 ? 'direct' : 'linked';
  };

  return (path) => {
    const segments = segmentsBelow(path);

    return segments && walk(segments, 0);
  };
}

function readLink(path: string): string | undefined {
  return lstatSync(path, { throwIfNoEntry: false })?.isSymbolicLink() === true
    ? resolve(dirname(path), readlinkSync(path))
    : undefined;
}
