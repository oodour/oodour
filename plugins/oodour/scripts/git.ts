import { execFileSync, spawnSync, type StdioOptions } from 'node:child_process';
import { lstatSync, realpathSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
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
  'core.commitGraph=false',
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

// Stryker disable next-line ArrayDeclaration: an empty list pipes all three streams, which keeps Git's errors off this process's stderr as well, and Git reads the end of input from a pipe nothing is written to as it does from no input
const quiet: StdioOptions = ['ignore', 'pipe', 'pipe'];

export interface Repository {
  readonly git: Git;
  readonly top: string;
  readonly prefix: string;
}

// Read with no includes followed, so a file an include names is checked before git opens it.
const readConfig: ConfigReader = (file) =>
  gitText(
    execFileSync('git', ['config', '--file', file, '--list', '-z'], { ...childOptions(), encoding: 'buffer', stdio: quiet }),
  );

// Finds a repository the way Git starts to, by a `.git` entry in the folder or one above it, without starting Git.
export function repositoryTop(folder: string): string | undefined {
  for (let current = resolve(folder), above = dirname(current); ; current = above, above = dirname(current)) {
    if (lstatSync(join(current, '.git'), { throwIfNoEntry: false }) !== undefined) {
      return current;
    }

    if (above === current) {
      return undefined;
    }
  }
}

const notInstalled = (error: unknown): boolean => error instanceof Error && 'code' in error && error.code === 'ENOENT';

// Each start of Git costs tens of milliseconds on Windows, so one rev-parse answers every question about the folder.
export function gitIn(folder: string): Repository | undefined {
  try {
    assertLocalMetadata(folder, readConfig);
  } catch (error) {
    if (notInstalled(error)) {
      return undefined;
    }

    throw error;
  }

  const probe = spawnSync('git', safely(folder, ['rev-parse', '--show-toplevel', '--show-prefix']), childOptions());

  if (probe.error) {
    if (notInstalled(probe.error)) {
      return undefined;
    }

    throw probe.error;
  }

  if (probe.status !== 0) {
    // Git 2.56 words a .git file that points nowhere differently than Git 2.54 does.
    if (
      probe.stderr.includes('not a git repository') ||
      probe.stderr.includes('gitfile does not point to a valid repository')
    ) {
      return undefined;
    }

    throw new Error(`git: ${probe.stderr.trim()}`);
  }

  const shown = probe.stdout.split('\n');
  // Stryker disable next-line StringLiteral: Git prints both lines whenever it exits with 0, so neither default is used
  const [shownTop = '', prefix = ''] = shown;
  // Stryker disable next-line LzJsNumericLiteral: each of these limits is past the longest string Node.js holds, about half a gibibyte, so output between two of them fails either way
  const maxBuffer = 1024 ** 3;
  const git: Git = (args) => execFileSync('git', safely(folder, args), { ...childOptions(), maxBuffer, stdio: quiet });
  // The repository's own config can set its work tree anywhere, a network share included.
  const top = resolve(shownTop);

  if (pathBelow(top, realpathSync.native(resolve(folder))) === undefined) {
    throw new Error(`git: the repository's work tree ${top} does not hold ${folder}`);
  }

  if (lstatSync(join(top, '.git'), { throwIfNoEntry: false }) === undefined) {
    throw new Error(`git: the repository's work tree ${top} has no .git of its own, so its config moved it there`);
  }

  // Git names the folder from the top folder itself, so a short or differently cased path to either cannot mislead it.
  return { git, top, prefix };
}
