import { type Dirent, lstatSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { placeBelow } from './below.ts';
import { repositoryTop, type Repository } from './git.ts';
import { type IgnoreFile, ignoreFileIn, isIgnored, isIgnoreFileName } from './gitignore.ts';

const withSlashes = (path: string): string => path.replaceAll('\\', '/');

export interface Sources {
  readonly root: string;
  readonly all: readonly string[];
  readonly inScope: readonly string[];
  readonly skipped: readonly string[];
  readonly ignoreFiles: readonly string[];
  readonly scopeIgnored: boolean;
}

const source =/(?<!\.d)\.[cm]?[jt]sx?$/;

export function isTest(file: string): boolean {
  return /\.(?:test|spec)\.[cm]?[jt]sx?$|(?:^|\/)__tests__\//.test(file);
}

const notWalked = new Set(['.git', 'node_modules']);

export interface Walked {
  readonly files: readonly string[];
  readonly skipped: readonly string[];
  // The ignore files read, as paths from the repository's top.
  readonly ignoreFiles: readonly string[];
  readonly scopeIgnored: boolean;
}

// Where the scope sits below the repository's top, the ignore files above it, and whether it lies in an ignored folder.
export interface Ignoring {
  readonly prefix: string;
  readonly above: readonly IgnoreFile[];
  readonly scopeIgnored: boolean;
}

const joined = (...parts: readonly string[]): string => parts.filter((part) => part !== '').join('/');

// readdirSync names a link as a link, so the walk never enters one: on Windows, listing a folder a link leads to on
// \\host\share sends the user's credentials to that host. globSync enters links on Node.js 22. A name ending in a dot
// or a space is reported, not listed: a reader that opens it without the \\?\ prefix opens the name without them.
// Inside a repository, each folder's .gitignore is read as text and what the ignore files match is left out, as Git
// leaves out untracked files they match, without starting Git.
export function filesBelow(root: string, ignoring?: Ignoring): Walked {
  const above = ignoring?.above ?? [];
  const read = above.map((file) => file.path);

  if (ignoring?.scopeIgnored === true) {
    return { files: [], skipped: [], ignoreFiles: read, scopeIgnored: true };
  }

  const prefix = ignoring?.prefix ?? '';
  const files: string[] = [];
  const skipped: string[] = [];
  const folders: { readonly folder: string; readonly ignoreFiles: readonly IgnoreFile[] }[] = [
    { folder: '', ignoreFiles: above },
  ];

  for (let next = folders.pop(); next !== undefined; next = folders.pop()) {
    const { folder } = next;
    const entries = folder === '' ? readdirSync(root, { withFileTypes: true }) : listed(join(root, folder));

    if (entries === undefined || (folder !== '' && entries.some((entry) => entry.name === '.git'))) {
      skipped.push(folder);
      continue;
    }

    const ownName = entries.find((entry) => isIgnoreFileName(entry.name) && entry.isFile())?.name;
    const own =
      ignoring !== undefined && ownName !== undefined
        ? ignoreFileIn(
            joined(prefix, folder),
            joined(prefix, folder, ownName),
            readFileSync(join(root, folder, ownName), 'utf8'),
          )
        : undefined;
    const ignoreFiles = own === undefined ? next.ignoreFiles : [...next.ignoreFiles, own];

    if (own !== undefined) {
      read.push(own.path);
    }

    for (const entry of entries) {
      const path = joined(folder, entry.name);

      if (isIgnored(ignoreFiles, joined(prefix, path), entry.isDirectory())) {
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

  return { files: files.sort(), skipped: skipped.sort(), ignoreFiles: read.sort(), scopeIgnored: false };
}

// .git/info/exclude, then the .gitignore of each folder from the top down to the one above the scope (`root`). A folder
// on the way that these ignore makes the whole scope ignored: Git re-includes nothing below an ignored folder.
export function ignoringAt(top: string, root: string): Ignoring {
  const prefix = withSlashes(relative(top, root));
  const folders = ['', ...(prefix === '' ? [] : prefix.split('/').map((_, index, parts) => joined(...parts.slice(0, index + 1))))];
  let above = ignoreFileAt(top, '', '.git/info/exclude');

  for (const folder of folders) {
    if (folder !== '' && isIgnored(above, folder, true)) {
      return { prefix, above, scopeIgnored: true };
    }

    if (folder !== prefix) {
      above = [...above, ...ignoreFileAt(top, folder, joined(folder, '.gitignore'))];
    }
  }

  return { prefix, above, scopeIgnored: false };
}

function ignoreFileAt(top: string, folder: string, path: string): IgnoreFile[] {
  const text = plainFileText(top, path);

  return text === undefined ? [] : [ignoreFileIn(folder, path, text)];
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
    const top = repositoryTop(root);
    const { files, skipped, ignoreFiles, scopeIgnored } = filesBelow(root, top === undefined ? undefined : ignoringAt(top, root));
    const all = files.filter(isSourceOnDisk(root));

    return { root, all, inScope: all, skipped, ignoreFiles, scopeIgnored };
  }

  const { git, top, prefix } = repository;
  const all = git(['ls-files', '--cached', '--others', '--exclude-standard', '--full-name', ':/'])
    .split('\n')
    .filter(isSourceOnDisk(top));

  return {
    root: top,
    all,
    inScope: all.filter((file) => file.startsWith(prefix)),
    skipped: [],
    ignoreFiles: [],
    scopeIgnored: false,
  };
}
