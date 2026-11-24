import ignore, { type Ignore } from 'ignore';

// One ignore file: its path from the repository's top, and the folder its rules apply to, as a path from the top that
// ends in `/`, or '' for the top itself.
export interface IgnoreFile {
  readonly path: string;
  readonly base: string;
  readonly rules: Ignore;
}

// Git sets core.ignoreCase on the file systems of Windows and macOS when it creates a repository.
const ignorecase = process.platform === 'win32' || process.platform === 'darwin';

export const isIgnoreFileName = (name: string): boolean => (ignorecase ? name.toLowerCase() : name) === '.gitignore';

export function ignoreFileIn(folder: string, path: string, text: string): IgnoreFile {
  return { path, base: folder === '' ? '' : `${folder}/`, rules: ignore({ ignorecase }).add(text) };
}

// Git applies the ignore files from the top down; a deeper file's rule overrides a higher one's. The walk asks about a
// folder before it enters it, so a rule the package matches only through the folder above (the same rule matches that
// folder) has already been decided there, and a deeper file may have overridden it. shortcut: a rule that matches a
// re-included folder and, by itself, a file in it (`foo*` with `!foo1/`) is read as matching the folder only; match
// without the package's parent check if a real repository needs that case.
export function isIgnored(files: readonly IgnoreFile[], path: string, isFolder: boolean): boolean {
  let ignored = false;

  for (const { base, rules } of files) {
    if (path.startsWith(base)) {
      const below = path.slice(base.length);
      const result = rules.test(`${below}${isFolder ? '/' : ''}`);
      const above = below.includes('/') ? rules.test(`${below.slice(0, below.lastIndexOf('/'))}/`) : undefined;
      const throughFolder = result.ignored && result.rule !== undefined && result.rule === above?.rule;

      if ((result.ignored || result.unignored) && !throughFolder) {
        ignored = result.ignored;
      }
    }
  }

  return ignored;
}
