import {
  type Dirent,
  lstatSync,
  readdirSync,
  readFileSync,
  statSync,
} from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { placeBelow } from './below.ts';
import { repositoryTop, type Repository } from './git.ts';
import {
  type IgnoreFile,
  ignoreFileIn,
  isIgnored,
  isNamed,
} from './gitignore.ts';

const withSlashes = (path: string): string => path.replaceAll('\\', '/');

// The folders the ignore files match, from the scope, which the walk did not enter; the whole scope when it lies in an
// ignored folder; undefined when no ignore file was applied (outside a repository, or Git listed the files).
export type Ignored = readonly string[] | 'whole scope' | undefined;

export interface Sources {
  readonly root: string;
  readonly all: readonly string[];
  readonly inScope: readonly string[];
  readonly skipped: readonly string[];
  readonly ignored: Ignored;
}

const source = /(?<!\.d)\.[cm]?[jt]sx?$/;

export function isTest(file: string): boolean {
  return /\.(?:test|spec)\.[cm]?[jt]sx?$|(?:^|\/)__tests__\//.test(file);
}

// Git never lists what is in .git, whatever its case where names have none; node_modules is left out by choice.
const isNotWalked = (name: string): boolean =>
  isNamed(name, '.git') || name === 'node_modules';

export interface Walked {
  readonly files: readonly string[];
  readonly skipped: readonly string[];
  readonly ignored: readonly string[] | undefined;
}

// Where the scope sits below the repository's top, and the ignore files above it.
export interface Ignoring {
  readonly prefix: string;
  readonly above: readonly IgnoreFile[];
}

const joined = (...parts: readonly string[]): string =>
  parts.filter((part) => part !== '').join('/');

// readdirSync names a link as a link, so the walk never enters one: on Windows, listing a folder a link leads to on
// \\host\share sends the user's credentials to that host. globSync enters links on Node.js 22. A name ending in a dot
// or a space is reported, not listed: a reader that opens it without the \\?\ prefix opens the name without them.
// Inside a repository, each folder's .gitignore is read as text and what the ignore files match is left out, as Git
// leaves out untracked files they match, without starting Git.
export function filesBelow(root: string, ignoring?: Ignoring): Walked {
  // Stryker disable next-line StringLiteral: without `ignoring` no ignore file is read, so the prefix reaches no rule
  const prefix = ignoring?.prefix ?? '';
  const files: string[] = [];
  const skipped: string[] = [];
  const ignored: string[] = [];
  const folders: {
    readonly folder: string;
    readonly ignoreFiles: readonly IgnoreFile[];
  }[] = [{ folder: '', ignoreFiles: ignoring?.above ?? [] }];

  for (let next = folders.pop(); next !== undefined; next = folders.pop()) {
    const { folder } = next;
    const entries =
      folder === ''
        ? readdirSync(root, { withFileTypes: true })
        : listed(join(root, folder));

    if (
      entries === undefined ||
      (folder !== '' && entries.some((entry) => isNamed(entry.name, '.git')))
    ) {
      skipped.push(folder);
      continue;
    }

    const ownName = entries.find(
      (entry) => isNamed(entry.name, '.gitignore') && entry.isFile(),
    )?.name;
    const ignoreFiles =
      ignoring !== undefined && ownName !== undefined
        ? [
            ...next.ignoreFiles,
            ignoreFileIn(
              joined(prefix, folder),
              readFileSync(join(root, folder, ownName), 'utf8'),
            ),
          ]
        : next.ignoreFiles;

    for (const entry of entries) {
      const path = joined(folder, entry.name);

      if (entry.isDirectory() && isNotWalked(entry.name)) {
        continue;
      }

      if (entry.isSymbolicLink() || /[. ]$/.test(entry.name)) {
        skipped.push(path);
      } else if (
        isIgnored(ignoreFiles, joined(prefix, path), entry.isDirectory())
      ) {
        if (entry.isDirectory()) {
          ignored.push(path);
        }
      } else if (entry.isDirectory()) {
        folders.push({ folder: path, ignoreFiles });
      } else if (entry.isFile()) {
        files.push(path);
      }
    }
  }

  return {
    files: files.sort(),
    skipped: skipped.sort(),
    ignored: ignoring === undefined ? undefined : ignored.sort(),
  };
}

// .git/info/exclude, then the .gitignore of each folder from the top down to the one above the scope (`root`). A folder
// on the way that these ignore makes the whole scope ignored: Git re-includes nothing below an ignored folder.
export function ignoringAt(
  top: string,
  root: string,
): Ignoring | 'whole scope' {
  const prefix = withSlashes(relative(top, root));
  // At the top itself the prefix is '', which names the top a second time. The top and the scope's own .gitignore are
  // then read again here or by the walk, and the same rules applied twice decide the same.
  const folders = [
    '',
    ...prefix
      .split('/')
      .map((_, index, parts) => joined(...parts.slice(0, index + 1))),
  ];
  let above = ignoreFileAt(top, '', '.git/info/exclude');

  for (const folder of folders) {
    if (folder !== '' && isIgnored(above, folder, true)) {
      return 'whole scope';
    }

    above = [
      ...above,
      ...ignoreFileAt(top, folder, joined(folder, '.gitignore')),
    ];
  }

  return { prefix, above };
}

function ignoreFileAt(top: string, folder: string, path: string): IgnoreFile[] {
  const text = plainFileText(top, path);

  return text === undefined ? [] : [ignoreFileIn(folder, text)];
}

// The text of a file below `top`, read only when no part of its path is a link.
function plainFileText(top: string, path: string): string | undefined {
  const parts = path.split('/');
  let current = top;

  for (const [index, part] of parts.entries()) {
    current = join(current, part);
    const stats = lstatSync(current, { throwIfNoEntry: false });

    if (
      stats === undefined ||
      !(index === parts.length - 1 ? stats.isFile() : stats.isDirectory())
    ) {
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
    if (
      error instanceof Error &&
      'code' in error &&
      typeof error.code === 'string' &&
      unlistable.has(error.code)
    ) {
      return undefined;
    }

    throw error;
  }
}

export function sources(
  scope: string,
  repository: Repository | undefined,
): Sources {
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
    const ignoring = top === undefined ? undefined : ignoringAt(top, root);

    if (ignoring === 'whole scope') {
      return { root, all: [], inScope: [], skipped: [], ignored: ignoring };
    }

    const { files, skipped, ignored } = filesBelow(root, ignoring);
    const all = files.filter(isSourceOnDisk(root));

    return { root, all, inScope: all, skipped, ignored };
  }

  const { git, top, prefix } = repository;
  const all = git([
    'ls-files',
    '--cached',
    '--others',
    '--exclude-standard',
    '--full-name',
    ':/',
  ])
    .split('\n')
    .filter(isSourceOnDisk(top));

  return {
    root: top,
    all,
    inScope: all.filter((file) => file.startsWith(prefix)),
    skipped: [],
    ignored: undefined,
  };
}
