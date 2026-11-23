import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import type { TestContext } from 'node:test';
import { pathToFileURL } from 'node:url';

type Files = Readonly<Record<string, string>>;

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
  return execFileSync('git', ['-c', 'user.name=lz-oop', '-c', 'user.email=lz-oop', ...args], {
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

export function repositoryWith(context: TestContext, commits: readonly Files[]): string {
  const root = folderWith(context, {});
  runGit(root, ['init', '-q']);

  for (const files of commits) {
    commitFiles(root, files);
  }

  return root;
}

export function partialCloneOf(context: TestContext, origin: string): string {
  runGit(origin, ['config', 'uploadpack.allowFilter', 'true']);
  const clone = folderWith(context, {});
  runGit(clone, ['clone', '-q', '--filter=blob:none', pathToFileURL(origin).href, '.']);
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
