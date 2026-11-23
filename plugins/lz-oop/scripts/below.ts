import { lstatSync, readlinkSync } from 'node:fs';
import { isAbsolute, join, parse, relative, resolve, sep } from 'node:path';

export type Place = 'direct' | 'linked';

const mostLinks = 40;

export function pathBelow(root: string, path: string): string | undefined {
  const below = relative(root, resolve(root, path));

  return below === '..' || below.startsWith(`..${sep}`) || isAbsolute(below) ? undefined : below;
}

const segmentsOf = (path: string): readonly string[] => path.split(sep === '\\' ? /[\\/]/ : '/');

interface Walk {
  readonly base: string;
  readonly segments: readonly string[];
}

// Links are followed by reading them, never by opening their targets: on Windows, opening a link to \\host\share
// sends the user's credentials to that host. A path is walked one segment at a time, since a system that follows a
// link before it applies `..` can step back out of the folder that link led into.
function walk(
  start: Walk,
  startAbsolute: (target: string) => Walk | undefined,
  linkTarget: (path: string) => string | undefined,
  stepBackFromBase: 'leaves' | 'stays',
): { readonly path: string; readonly links: number } | undefined {
  let { base } = start;
  let walked: string[] = [];
  let pending = [...start.segments];
  let links = 0;

  for (let segment = pending.shift(); segment !== undefined; segment = pending.shift()) {
    if (segment === '' || segment === '.') {
      continue;
    }

    if (segment === '..') {
      if (walked.pop() === undefined && stepBackFromBase === 'leaves') {
        return undefined;
      }

      continue;
    }

    const target = linkTarget(join(base, ...walked, segment));

    if (target === undefined) {
      walked.push(segment);
      continue;
    }

    if (links === mostLinks) {
      return undefined;
    }

    links += 1;
    const next = isAbsolute(target) ? startAbsolute(target) : { base, segments: [...walked, ...segmentsOf(target)] };

    if (next === undefined) {
      return undefined;
    }

    base = next.base;
    walked = [];
    pending = [...next.segments, ...pending];
  }

  return { path: join(base, ...walked), links };
}

export function placeBelow(root: string): (path: string) => Place | undefined {
  const targets = new Map<string, string | undefined>();
  const linkTarget = (path: string): string | undefined => {
    if (!targets.has(path)) {
      targets.set(path, readLink(path));
    }

    return targets.get(path);
  };
  // Only the part of an absolute path before its first `..` names a place by its text alone.
  const fromRoot = (path: string): Walk | undefined => {
    const segments = segmentsOf(path);
    const stepBack = segments.indexOf('..');
    const plainCount = stepBack === -1 ? segments.length : stepBack;
    const plain = segments.slice(0, plainCount).join(sep);
    const below = isAbsolute(plain) ? pathBelow(root, plain) : undefined;

    return below === undefined ? undefined : { base: root, segments: [...segmentsOf(below), ...segments.slice(plainCount)] };
  };

  return (path) => {
    const start = isAbsolute(path) ? fromRoot(path) : { base: root, segments: segmentsOf(path) };
    const walked = start && walk(start, fromRoot, linkTarget, 'leaves');

    return walked && (walked.links === 0 ? 'direct' : 'linked');
  };
}

// \\host\share and //host/share name a network path; \\?\ and \\.\ are device paths that can name one too.
export const namesNetworkPath = (path: string): boolean => /^[\\/]{2}/.test(path);

const fromFilesystemRoot = (path: string): Walk | undefined => {
  if (namesNetworkPath(path)) {
    return undefined;
  }

  const { root } = parse(path);

  return { base: root, segments: segmentsOf(path.slice(root.length)) };
};

export function localPath(path: string): string | undefined {
  const start = fromFilesystemRoot(isAbsolute(path) ? path : `${process.cwd()}${sep}${path}`);

  // A `..` at the filesystem root names the root itself.
  return start && walk(start, fromFilesystemRoot, readLink, 'stays')?.path;
}

function readLink(path: string): string | undefined {
  return lstatSync(path, { throwIfNoEntry: false })?.isSymbolicLink() === true ? readlinkSync(path) : undefined;
}
