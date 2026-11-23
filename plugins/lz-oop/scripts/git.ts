import { execFileSync, spawnSync } from 'node:child_process';
import { lstatSync, realpathSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { pathBelow } from './below.ts';
import { gitText } from './git-text.ts';
import { assertLocalMetadata, type ConfigReader } from './metadata.ts';

export type Git = (args: readonly string[]) => string;

// Windows looks for a program in the working folder before PATH, so git starts in this folder and goes to the
// audited one with -C. The settings stop the audited repository's own config from starting programs, fetching, or
// reading files it names, which could be on a network share. An empty order file fails, so it names the null device.
const overrides = [
  'core.quotePath=false',
  'core.fsmonitor=false',
  'log.showSignature=false',
  'diff.orderFile=/dev/null',
  'mailmap.file=',
  'mailmap.blob=',
  'log.mailmap=false',
  'core.multiPackIndex=false',
] as const;

const safely = (folder: string, args: readonly string[]): readonly string[] => [
  '-C',
  resolve(folder),
  ...overrides.flatMap((setting) => ['-c', setting]),
  ...args,
];

// GIT_ALLOW_PROTOCOL names no real protocol, so no remote can be reached on any Git version; it also overrides the
// repository's own protocol settings. Git translates its messages, and only the English one tells "no repository"
// from a repository it refuses.
const childOptions = () =>
  ({
    cwd: import.meta.dirname,
    encoding: 'utf8',
    env: { ...process.env, GIT_ALLOW_PROTOCOL: 'none', GIT_NO_LAZY_FETCH: '1', LANGUAGE: 'C', LC_ALL: 'C' },
  }) as const;

export interface Repository {
  readonly git: Git;
  readonly top: string;
  readonly prefix: string;
}

// Read with no includes followed, so a file an include names is checked before git opens it.
const readConfig: ConfigReader = (file) =>
  gitText(
    execFileSync('git', ['config', '--file', file, '--list', '-z'], {
      ...childOptions(),
      encoding: 'buffer',
      stdio: ['ignore', 'pipe', 'pipe'],
    }),
  );

export function gitIn(folder: string): Repository | undefined {
  const installed = spawnSync('git', ['--version'], childOptions());

  if (installed.error) {
    if ('code' in installed.error && installed.error.code === 'ENOENT') {
      return undefined;
    }

    throw installed.error;
  }

  assertLocalMetadata(folder, readConfig);
  const probe = spawnSync('git', safely(folder, ['rev-parse', '--is-inside-work-tree']), childOptions());

  if (probe.error) {
    throw probe.error;
  }

  if (probe.status !== 0) {
    if (probe.stderr.includes('not a git repository')) {
      return undefined;
    }

    throw new Error(`git: ${probe.stderr.trim()}`);
  }

  const git: Git = (args) =>
    execFileSync('git', safely(folder, args), { ...childOptions(), maxBuffer: 1024 ** 3, stdio: ['ignore', 'pipe', 'pipe'] });
  // The repository's own config can set its work tree anywhere, a network share included.
  const top = resolve(git(['rev-parse', '--show-toplevel']).trim());

  if (pathBelow(top, realpathSync.native(resolve(folder))) === undefined) {
    throw new Error(`git: the repository's work tree ${top} does not hold ${folder}`);
  }

  if (lstatSync(join(top, '.git'), { throwIfNoEntry: false }) === undefined) {
    throw new Error(`git: the repository's work tree ${top} has no .git of its own, so its config moved it there`);
  }

  // Git names the folder from the top folder itself, so a short or differently cased path to either cannot mislead it.
  return { git, top, prefix: git(['rev-parse', '--show-prefix']).trim() };
}
