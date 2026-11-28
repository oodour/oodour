import { lstatSync, readlinkSync } from 'node:fs';
import { isAbsolute, join, parse, relative, resolve, sep } from 'node:path';

export type Place = 'direct' | 'linked';

const mostLinks = 40;

export function pathBelow(root: string, path: string): string | undefined {
  const below = relative(root, resolve(root, path));

  return below === '..' || below.startsWith(`..${sep}`) || isAbsolute(below) ? undefined : below;
}

// Where the separator is a backslash, a slash separates too.
const segmentsOf = (path: string): readonly string[] => path.split(sep).flatMap((part) => part.split('/'));

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
  entryAt: (path: string) => Entry,
  stepBackFromBase: 'leaves' | 'stays',
): { readonly path: string; readonly links: number } | undefined {
  let { base } = start;
  let walked: string[] = [];
  // The path after each walked segment, so a long path is not joined again at every step.
  let trail: string[] = [];
  let pending = [...start.segments];
  let links = 0;

  for (let segment = pending.shift(); segment !== undefined; segment = pending.shift()) {
    if (segment === '' || segment === '.') {
      continue;
    }

    if (segment === '..') {
      trail.pop();

      if (walked.pop() === undefined && stepBackFromBase === 'leaves') {
        return undefined;
      }

      continue;
    }

    const path = childPath(trail.at(-1) ?? base, segment);
    const entry = entryAt(path);

    // Nothing below a missing entry is a link, so only a step back can lead anywhere else.
    if (!entry.exists && !pending.includes('..')) {
      return { path: join(path, ...pending), links };
    }

    const { target } = entry;

    if (target === undefined) {
      walked.push(segment);
      trail.push(path);
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
    trail = [];
    pending = [...next.segments, ...pending];
  }

  return { path: join(base, ...walked), links };
}

export function placeBelow(root: string): (path: string) => Place | undefined {
  const entryAt = remembered(readEntry);
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
    const walked = start && walk(start, fromRoot, entryAt, 'leaves');

    return walked && (walked.links === 0 ? 'direct' : 'linked');
  };
}

// The path of `name` in `folder`, without `join`, which would apply a `..` by its text. A root such as `/` ends in the
// separator already, and `//name` would name a network path.
export const childPath = (folder: string, name: string): string =>
  folder.endsWith(sep) ? `${folder}${name}` : `${folder}${sep}${name}`;

// \\host\share and //host/share name a network path; \\?\ and \\.\ are device paths that can name one too.
export const namesNetworkPath = (path: string): boolean => /^[\\/]{2}/.test(path);

const fromFilesystemRoot = (path: string): Walk | undefined => {
  if (namesNetworkPath(path)) {
    return undefined;
  }

  const { root } = parse(path);

  return { base: root, segments: segmentsOf(path.slice(root.length)) };
};

export const localPath = (path: string): string | undefined => localPathWith(path, readEntry);

// For many paths in a short time: each entry is read once, so a change made to it meanwhile goes unseen.
export function cachedLocalPath(): (path: string) => string | undefined {
  const entryAt = remembered(readEntry);

  return (path) => localPathWith(path, entryAt);
}

function localPathWith(path: string, entryAt: (path: string) => Entry): string | undefined {
  const start = fromFilesystemRoot(isAbsolute(path) ? path : childPath(process.cwd(), path));

  // A `..` at the filesystem root names the root itself.
  return start && walk(start, fromFilesystemRoot, entryAt, 'stays')?.path;
}

interface Entry {
  readonly exists: boolean;
  readonly target: string | undefined;
}

// Below a file, past the longest name, or in a folder the user may not search, nothing can be opened, Git included.
const unreachable = new Set(['ENOTDIR', 'ENAMETOOLONG', 'EACCES']);

function readEntry(path: string): Entry {
  try {
    const stats = lstatSync(path, { throwIfNoEntry: false });

    return { exists: stats !== undefined, target: stats?.isSymbolicLink() === true ? readlinkSync(path) : undefined };
  } catch (error) {
    if (error instanceof Error && 'code' in error && typeof error.code === 'string' && unreachable.has(error.code)) {
      return { exists: false, target: undefined };
    }

    throw error;
  }
}

function remembered(read: (path: string) => Entry): (path: string) => Entry {
  const entries = new Map<string, Entry>();

  return (path) => {
    const known = entries.get(path) ?? read(path);
    entries.set(path, known);

    return known;
  };
}
