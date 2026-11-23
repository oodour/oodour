import { globSync, statSync } from 'node:fs';
import { basename, join, resolve } from 'node:path';
import { placeBelow } from './below.ts';
import type { Repository } from './git.ts';

export interface Sources {
  readonly root: string;
  readonly all: readonly string[];
  readonly inScope: readonly string[];
}

const source = /(?<!\.d)\.[cm]?[jt]sx?$/;

export function isTest(file: string): boolean {
  return /\.(?:test|spec)\.[cm]?[jt]sx?$|(?:^|\/)__tests__\//.test(file);
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
    const all = globSync('**/*', { cwd: root, exclude: (path) => basename(path) === 'node_modules' })
      .map((file) => file.replaceAll('\\', '/'))
      .filter(isSourceOnDisk(root))
      .sort();

    return { root, all, inScope: all };
  }

  const { git, top, prefix } = repository;
  const all = git(['ls-files', '--cached', '--others', '--exclude-standard', '--full-name', ':/'])
    .split('\n')
    .filter(isSourceOnDisk(top));

  return { root: top, all, inScope: all.filter((file) => file.startsWith(prefix)) };
}
