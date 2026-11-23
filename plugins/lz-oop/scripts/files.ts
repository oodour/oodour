import { globSync, statSync } from 'node:fs';
import { basename, join, resolve } from 'node:path';
import type { Git } from './git.ts';

export interface Sources {
  readonly root: string;
  readonly all: readonly string[];
  readonly inScope: readonly string[];
}

const source = /(?<!\.d)\.[cm]?[jt]sx?$/;

export function isTest(file: string): boolean {
  return /\.(?:test|spec)\.[cm]?[jt]sx?$|(?:^|\/)__tests__\//.test(file);
}

export function sources(scope: string, git: Git | undefined): Sources {
  const onDisk = (root: string) => (file: string) =>
    source.test(file) && statSync(join(root, file), { throwIfNoEntry: false })?.isFile() === true;

  if (git === undefined) {
    const root = resolve(scope);
    const all = globSync('**/*', { cwd: root, exclude: (path) => basename(path) === 'node_modules' })
      .map((file) => file.replaceAll('\\', '/'))
      .filter(onDisk(root))
      .sort();

    return { root, all, inScope: all };
  }

  const root = resolve(git(['rev-parse', '--show-toplevel']).trim());
  const all = git(['ls-files', '--cached', '--others', '--exclude-standard', '--full-name', ':/'])
    .split('\n')
    .filter(onDisk(root));
  // Git names the scope from the top folder itself, so a short or differently cased path to either cannot mislead it.
  const prefix = git(['rev-parse', '--show-prefix']).trim();

  return { root, all, inScope: all.filter((file) => file.startsWith(prefix)) };
}
