import ignore, { type Ignore } from 'ignore';

// One ignore file: the folder its rules apply to, as a path from the repository's top that ends in `/`, or '' for the
// top itself.
export interface IgnoreFile {
  readonly base: string;
  readonly rules: Ignore;
}

// Git sets core.ignoreCase on the file systems of Windows and macOS when it creates a repository.
export const ignoresCase = (platform: NodeJS.Platform): boolean => platform === 'win32' || platform === 'darwin';

const hostIgnoresCase = ignoresCase(process.platform);

export const isNamed = (name: string, gitName: string): boolean => (hostIgnoresCase ? name.toLowerCase() : name) === gitName;

export function ignoreFileIn(folder: string, text: string, ignorecase = hostIgnoresCase): IgnoreFile {
  return { base: folder === '' ? '' : `${folder}/`, rules: ignore({ ignorecase }).add(text) };
}

// Git applies the ignore files from the top down; a deeper file's rule overrides a higher one's. The walk asks about a
// folder before it enters it, so a rule the package matches only through the folder above (the same rule matches that
// folder) has already been decided there, and a deeper file may have overridden it. shortcut: when a deeper file
// re-includes a folder that a higher file's rule ignores, and that rule also matches a file in it by itself (`a/**`,
// or `foo*` for `foo1/foo.ts`), the file is listed though Git leaves it out; match without the package's parent check
// if a real repository needs that case.
export function isIgnored(files: readonly IgnoreFile[], path: string, isFolder: boolean): boolean {
  let ignored = false;

  for (const { base, rules } of files) {
    if (path.startsWith(base)) {
      const below = path.slice(base.length);
      const result = rules.test(`${below}${isFolder ? '/' : ''}`);
      const above = below.includes('/') ? rules.test(`${below.slice(0, below.lastIndexOf('/'))}/`) : undefined;
      const throughFolder = result.ignored && result.rule === above?.rule;

      if ((result.ignored || result.unignored) && !throughFolder) {
        ignored = result.ignored;
      }
    }
  }

  return ignored;
}
