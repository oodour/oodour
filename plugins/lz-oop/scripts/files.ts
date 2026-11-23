import { type Dirent, readdirSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { placeBelow } from './below.ts';
import type { Repository } from './git.ts';

export interface Sources {
  readonly root: string;
  readonly all: readonly string[];
  readonly inScope: readonly string[];
  readonly skipped: readonly string[];
}

const source = /(?<!\.d)\.[cm]?[jt]sx?$/;

export function isTest(file: string): boolean {
  return /\.(?:test|spec)\.[cm]?[jt]sx?$|(?:^|\/)__tests__\//.test(file);
}

const notWalked = new Set(['.git', 'node_modules']);

export interface Walked {
  readonly files: readonly string[];
  readonly skipped: readonly string[];
}

// readdirSync names a link as a link, so the walk never enters one: on Windows, listing a folder a link leads to on
// \\host\share sends the user's credentials to that host. globSync enters links on Node.js 22. A name ending in a dot
// or a space is reported, not listed: a reader that opens it without the \\?\ prefix opens the name without them.
export function filesBelow(root: string): Walked {
  const files: string[] = [];
  const skipped: string[] = [];
  const folders = [''];

  for (let folder = folders.pop(); folder !== undefined; folder = folders.pop()) {
    const entries = folder === '' ? readdirSync(root, { withFileTypes: true }) : listed(join(root, folder));

    if (entries === undefined) {
      skipped.push(folder);
      continue;
    }

    for (const entry of entries) {
      const path = folder === '' ? entry.name : `${folder}/${entry.name}`;

      if (entry.isSymbolicLink() || /[. ]$/.test(entry.name)) {
        skipped.push(path);
      } else if (entry.isDirectory() && !notWalked.has(entry.name)) {
        folders.push(path);
      } else if (entry.isFile()) {
        files.push(path);
      }
    }
  }

  return { files: files.sort(), skipped: skipped.sort() };
}

const unlistable = new Set(['EPERM', 'EACCES']);

function listed(folder: string): Dirent[] | undefined {
  try {
    return readdirSync(folder, { withFileTypes: true });
  } catch (error) {
    if (error instanceof Error && 'code' in error && typeof error.code === 'string' && unlistable.has(error.code)) {
      return undefined;
    }

    throw error;
  }
}

export function sources(scope: string, repository: Repository | undefined): Sources {
  // A link, or a file below a linked folder, could lead outside the root, so it is checked before anything opens it.
  // A link that stays below the root is left out too: the file it leads to is listed under its own path.
  const isSourceOnDisk = (root: string) => {
    const place = placeBelow(root);

    return (file: string) =>
      source.test(file) &&
      place(file) === 'direct' &&
      statSync(join(root, file), { throwIfNoEntry: false })?.isFile() === true;
  };

  if (repository === undefined) {
    const root = resolve(scope);
    const { files, skipped } = filesBelow(root);
    const all = files.filter(isSourceOnDisk(root));

    return { root, all, inScope: all, skipped };
  }

  const { git, top, prefix } = repository;
  const all = git(['ls-files', '--cached', '--others', '--exclude-standard', '--full-name', ':/'])
    .split('\n')
    .filter(isSourceOnDisk(top));

  return { root: top, all, inScope: all.filter((file) => file.startsWith(prefix)), skipped: [] };
}
