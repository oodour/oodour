import ignore, { type Ignore } from 'ignore';

// The rules of one ignore file, and the folder they apply to: a path relative to the repository's top that ends in `/`,
// or '' for the top itself.
export interface IgnoreFile {
  readonly base: string;
  readonly rules: Ignore;
}

// Git sets core.ignoreCase on the file systems of Windows and macOS when it creates a repository.
const ignorecase = process.platform === 'win32' || process.platform === 'darwin';

export function ignoreRules(text: string): Ignore {
  return ignore({ ignorecase }).add(text);
}

// Git applies the ignore files from the top down; a deeper file's rule overrides a higher one's.
export function isIgnored(files: readonly IgnoreFile[], path: string, isFolder: boolean): boolean {
  let ignored = false;

  for (const { base, rules } of files) {
    if (path.startsWith(base)) {
      const result = rules.test(`${path.slice(base.length)}${isFolder ? '/' : ''}`);

      if (result.ignored || result.unignored) {
        ignored = result.ignored;
      }
    }
  }

  return ignored;
}
