import { type Dirent, lstatSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { placeBelow } from './below.ts';
import { repositoryTop, type Repository } from './git.ts';
import { type IgnoreFile, ignoreRules, isIgnored } from './gitignore.ts';

const withSlashes = (path: string): string => path.replaceAll('\\', '/');

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
// Inside a repository (`top` given), each folder's .gitignore is read as text and what it ignores is left out, so the
// walk lists what `git ls-files --others --exclude-standard` would without starting Git.
export function filesBelow(root: string, top?: string): Walked {
  const files: string[] = [];
  const skipped: string[] = [];
  const prefix = top === undefined ? '' : withSlashes(relative(top, root));
  const folders: { readonly folder: string; readonly ignoreFiles: readonly IgnoreFile[] }[] = [
    { folder: '', ignoreFiles: top === undefined ? [] : ignoreFilesAbove(top, prefix) },
  ];

  for (let next = folders.pop(); next !== undefined; next = folders.pop()) {
    const { folder } = next;
    const entries = folder === '' ? readdirSync(root, { withFileTypes: true }) : listed(join(root, folder));

    if (entries === undefined) {
      skipped.push(folder);
      continue;
    }

    const fromTop = (path: string) => [prefix, path].filter((part) => part !== '').join('/');
    const base = fromTop(folder);
    const ignoreFiles =
      top !== undefined && entries.some((entry) => entry.name === '.gitignore' && entry.isFile())
        ? [
            ...next.ignoreFiles,
            {
              base: base === '' ? '' : `${base}/`,
              rules: ignoreRules(readFileSync(join(root, folder, '.gitignore'), 'utf8')),
            },
          ]
        : next.ignoreFiles;

    for (const entry of entries) {
      const path = folder === '' ? entry.name : `${folder}/${entry.name}`;

      if (isIgnored(ignoreFiles, fromTop(path), entry.isDirectory())) {
        continue;
      }

      if (entry.isSymbolicLink() || /[. ]$/.test(entry.name)) {
        skipped.push(path);
      } else if (entry.isDirectory() && !notWalked.has(entry.name)) {
        folders.push({ folder: path, ignoreFiles });
      } else if (entry.isFile()) {
        files.push(path);
      }
    }
  }

  return { files: files.sort(), skipped: skipped.sort() };
}

// The text of a file below `top`, read only when no part of its path is a link.
function plainFileText(top: string, path: string): string | undefined {
  const parts = path.split('/');
  let current = top;

  for (const [index, part] of parts.entries()) {
    current = join(current, part);
    const stats = lstatSync(current, { throwIfNoEntry: false });

    if (stats === undefined || !(index === parts.length - 1 ? stats.isFile() : stats.isDirectory())) {
      return undefined;
    }
  }

  return readFileSync(current, 'utf8');
}

// .git/info/exclude, then the .gitignore of each folder from the top down to the one above the scope (`prefix`).
function ignoreFilesAbove(top: string, prefix: string): IgnoreFile[] {
  const above = prefix === '' ? [] : prefix.split('/').map((_, index, parts) => parts.slice(0, index).join('/'));
  const places = [
    { path: '.git/info/exclude', base: '' },
    ...above.map((folder) => ({
      path: folder === '' ? '.gitignore' : `${folder}/.gitignore`,
      base: folder === '' ? '' : `${folder}/`,
    })),
  ];

  return places.flatMap(({ path, base }) => {
    const text = plainFileText(top, path);

    return text === undefined ? [] : [{ base, rules: ignoreRules(text) }];
  });
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
    const { files, skipped } = filesBelow(root, repositoryTop(root));
    const all = files.filter(isSourceOnDisk(root));

    return { root, all, inScope: all, skipped };
  }

  const { git, top, prefix } = repository;
  const all = git(['ls-files', '--cached', '--others', '--exclude-standard', '--full-name', ':/'])
    .split('\n')
    .filter(isSourceOnDisk(top));

  return { root: top, all, inScope: all.filter((file) => file.startsWith(prefix)), skipped: [] };
}
