import { execFileSync, spawnSync } from 'node:child_process';
import { globSync } from 'node:fs';
import { basename, resolve } from 'node:path';

export interface Sources {
  /** The folder every path is named from: the repository's top folder, or the scope outside a repository. */
  readonly root: string;
  /** Every JavaScript and TypeScript file below the root, declaration files left out. */
  readonly all: readonly string[];
  /** The files of `all` inside the scope. */
  readonly inScope: readonly string[];
}

const source = /(?<!\.d)\.[cm]?[jt]sx?$/;

export function isTest(file: string): boolean {
  return /\.(?:test|spec)\.[cm]?[jt]sx?$|(?:^|\/)__tests__\//.test(file);
}

export function sources(scope: string): Sources {
  if (spawnSync('git', ['rev-parse', '--is-inside-work-tree'], { cwd: scope }).status !== 0) {
    const root = resolve(scope);
    const all = globSync('**/*', { cwd: root, exclude: (path) => basename(path) === 'node_modules' })
      .map((file) => file.replaceAll('\\', '/'))
      .filter((file) => source.test(file))
      .sort();

    return { root, all, inScope: all };
  }

  const git = (args: readonly string[]): string =>
    execFileSync('git', ['-c', 'core.quotePath=false', ...args], { cwd: scope, encoding: 'utf8', maxBuffer: 1024 ** 3 });
  const root = resolve(git(['rev-parse', '--show-toplevel']).trim());
  const all = git(['ls-files', '--cached', '--others', '--exclude-standard', '--full-name', ':/'])
    .split('\n')
    .filter((file) => source.test(file));
  // Git names the scope from the top folder itself, so a short or differently cased path to either cannot mislead it.
  const prefix = git(['rev-parse', '--show-prefix']).trim();

  return { root, all, inScope: all.filter((file) => file.startsWith(prefix)) };
}
