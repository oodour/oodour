import { lstatSync, readlinkSync } from 'node:fs';
import { isAbsolute, join, relative, resolve, sep } from 'node:path';

export type Place = 'direct' | 'linked';

const mostLinks = 40;

export function pathBelow(root: string, path: string): string | undefined {
  const below = relative(root, resolve(root, path));

  return below === '..' || below.startsWith(`..${sep}`) || isAbsolute(below) ? undefined : below;
}

const segmentsOf = (path: string): readonly string[] => path.split(sep === '\\' ? /[\\/]/ : '/');

// Links are followed by reading them, never by opening their targets: on Windows, opening a link to \\host\share
// sends the user's credentials to that host. A target is walked one segment at a time from the root, since a system
// that follows a link before it applies `..` can step back out of the folder that link led into.
export function placeBelow(root: string): (path: string) => Place | undefined {
  const targets = new Map<string, string | undefined>();
  const linkTarget = (path: string): string | undefined => {
    if (!targets.has(path)) {
      targets.set(path, readLink(path));
    }

    return targets.get(path);
  };
  // Only the part of an absolute target before its first `..` names a place by its text alone.
  const absoluteFromRoot = (target: string): readonly string[] | undefined => {
    const segments = segmentsOf(target);
    const stepBack = segments.indexOf('..');
    const plainCount = stepBack === -1 ? segments.length : stepBack;
    const plain = segments.slice(0, plainCount).join(sep);
    const below = isAbsolute(plain) ? pathBelow(root, plain) : undefined;

    return below === undefined ? undefined : [...segmentsOf(below), ...segments.slice(plainCount)];
  };

  return (path) => {
    const below = pathBelow(root, path);

    if (below === undefined) {
      return undefined;
    }

    let walked: string[] = [];
    let pending = [...segmentsOf(below)];
    let links = 0;

    for (let segment = pending.shift(); segment !== undefined; segment = pending.shift()) {
      if (segment === '' || segment === '.') {
        continue;
      }

      if (segment === '..') {
        if (walked.pop() === undefined) {
          return undefined;
        }

        continue;
      }

      const target = linkTarget(join(root, ...walked, segment));

      if (target === undefined) {
        walked.push(segment);
        continue;
      }

      if (links === mostLinks) {
        return undefined;
      }

      links += 1;
      const fromRoot = isAbsolute(target) ? absoluteFromRoot(target) : [...walked, ...segmentsOf(target)];

      if (fromRoot === undefined) {
        return undefined;
      }

      walked = [];
      pending = [...fromRoot, ...pending];
    }

    return links === 0 ? 'direct' : 'linked';
  };
}

function readLink(path: string): string | undefined {
  return lstatSync(path, { throwIfNoEntry: false })?.isSymbolicLink() === true ? readlinkSync(path) : undefined;
}
