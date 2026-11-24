import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import {
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  realpathSync,
  renameSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { delimiter, dirname, join } from 'node:path';
import type { TestContext } from 'node:test';
import { pathToFileURL } from 'node:url';

type Files = Readonly<Record<string, string>>;

// The tests' Git, and the Git the code under test starts, read no system or developer config and no Git variable of
// the shell that started the tests. Git for Windows refuses the null device as a config file; a missing file reads as
// empty.
for (const variable of Object.keys(process.env).filter((name) => name.startsWith('GIT_') && !name.startsWith('GIT_CONFIG_'))) {
  Reflect.deleteProperty(process.env, variable);
}

process.env['GIT_CONFIG_NOSYSTEM'] = '1';
process.env['GIT_CONFIG_GLOBAL'] = join(tmpdir(), 'lz-oop-tests-read-no-global-git-config');

let gitVersion: readonly number[] | undefined;

// Whether the installed Git is this version or later, for tests of what older Git cannot do. Only the test files that
// ask start Git for its version.
export function gitAtLeast(major: number, minor: number): boolean {
  gitVersion ??= (/(\d+)\.(\d+)/.exec(execFileSync('git', ['--version'], { encoding: 'utf8' })) ?? []).slice(1).map(Number);
  const [gitMajor = 0, gitMinor = 0] = gitVersion;

  return gitMajor > major || (gitMajor === major && gitMinor >= minor);
}

// A share on a host that cannot exist, in the form the system names one; elsewhere than Windows a backslash is part of
// a name, so a link to `\\host\share` would be an ordinary relative link.
export const networkShare = process.platform === 'win32' ? '\\\\lz-oop-test.invalid\\share' : '//lz-oop-test.invalid/share';

export function folderWith(context: TestContext, files: Files): string {
  const root = realpathSync.native(mkdtempSync(join(tmpdir(), 'lz-oop-')));
  context.after(() => {
    rmSync(root, { recursive: true, force: true });
  });
  writeFiles(root, files);

  return root;
}

export function writeFiles(root: string, files: Files): void {
  for (const [file, text] of Object.entries(files)) {
    mkdirSync(dirname(join(root, file)), { recursive: true });
    writeFileSync(join(root, file), text);
  }
}

export function runGit(root: string, args: readonly string[], date = '2026-11-01T12:00:00Z'): string {
  // A commit would otherwise start a second Git in the background for auto maintenance.
  return execFileSync('git', ['-c', 'user.name=lz-oop', '-c', 'user.email=lz-oop', '-c', 'maintenance.auto=false', ...args], {
    cwd: root,
    encoding: 'utf8',
    env: { ...process.env, GIT_AUTHOR_DATE: date, GIT_COMMITTER_DATE: date },
  });
}

export function commitFiles(root: string, files: Files, date?: string): void {
  writeFiles(root, files);
  runGit(root, ['add', '.'], date);
  runGit(root, ['commit', '-q', '-m', 'change'], date);
}

// Each repository a test builds is kept here, and a later test, in this process or another, that asks for the same
// commits copies it: on Windows, starting Git costs several times what copying its files does. Stryker's sandboxes link
// to the same node_modules folder.
const keptRepositories = join(import.meta.dirname, '..', '..', '..', 'node_modules', '.cache', 'lz-oop-fixtures');
let keyBase: string | undefined;

function keptRepository(commits: readonly Files[]): string {
  keyBase ??= JSON.stringify([readFileSync(import.meta.filename, 'utf8'), process.platform, installedGit()]);

  return join(keptRepositories, createHash('sha256').update(keyBase).update(JSON.stringify(commits)).digest('hex'));
}

// The Git on the path, by where it is, its size and when it was written, so that another Git builds its own
// repositories, without starting Git to ask its version.
function installedGit(): string {
  const program = process.platform === 'win32' ? 'git.exe' : 'git';

  for (const folder of (process.env['PATH'] ?? '').split(delimiter)) {
    const found = statSync(join(folder, program), { throwIfNoEntry: false });

    if (found?.isFile() === true) {
      return `${join(folder, program)} ${String(found.size)} ${String(found.mtimeMs)}`;
    }
  }

  return '';
}

export function repositoryWith(context: TestContext, commits: readonly Files[]): string {
  const root = folderWith(context, {});
  const kept = keptRepository(commits);

  if (existsSync(kept)) {
    cpSync(kept, root, { recursive: true });

    return root;
  }

  // No template: the kept copy holds the config and HEAD, not the sample hooks.
  runGit(root, ['init', '-q', '--template=']);

  for (const files of commits) {
    commitFiles(root, files);
  }

  keep(root, kept);

  return root;
}

function keep(root: string, kept: string): void {
  mkdirSync(keptRepositories, { recursive: true });
  const copy = mkdtempSync(join(keptRepositories, 'copy-'));
  cpSync(root, copy, { recursive: true });

  try {
    renameSync(copy, kept);
  } catch {
    // Another test process kept the same repository first.
    rmSync(copy, { recursive: true, force: true });
  }
}

// For tests that read no history: the files are in the work tree, uncommitted, which spares two Git starts.
export function repositoryHolding(context: TestContext, files: Files): string {
  const root = repositoryWith(context, []);
  writeFiles(root, files);

  return root;
}

export function partialCloneOf(context: TestContext, origin: string, filter = 'blob:none'): string {
  runGit(origin, ['config', 'uploadpack.allowFilter', 'true']);
  const clone = folderWith(context, {});
  runGit(clone, ['clone', '-q', `--filter=${filter}`, pathToFileURL(origin).href, '.']);
  rmSync(origin, { recursive: true, force: true });

  return clone;
}

export function outsideAnyRepository(context: TestContext): void {
  setForTest(context, 'GIT_CEILING_DIRECTORIES', tmpdir());
}

export function refusedByGit(context: TestContext): void {
  setForTest(context, 'GIT_TEST_ASSUME_DIFFERENT_OWNER', '1');
}

export function setForTest(context: TestContext, variable: string, value: string | undefined): void {
  const previous = process.env[variable];
  setVariable(variable, value);
  context.after(() => {
    setVariable(variable, previous);
  });
}

function setVariable(variable: string, value: string | undefined): void {
  if (value === undefined) {
    Reflect.deleteProperty(process.env, variable);
  } else {
    process.env[variable] = value;
  }
}
