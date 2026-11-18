import type { Project } from 'ts-morph';

/**
 * A ts-morph project on an in-memory file system, holding the given files (path -> text), with the same strict
 * compiler options as `tests/typed-fixture/tsconfig.json`. Codemod tests never touch the disk.
 */
export function inMemoryProject(files: Readonly<Record<string, string>>): Project {
  throw new Error(`not implemented: ${String(Object.keys(files).length)}`);
}

/** Every source file of the project as path -> current text, for one `deepEqual` against the expected files. */
export function sourceTexts(project: Project): Readonly<Record<string, string>> {
  throw new Error(`not implemented: ${String(project.getSourceFiles().length)}`);
}
