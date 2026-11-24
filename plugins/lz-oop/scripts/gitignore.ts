export interface IgnoreRule {
  readonly negated: boolean;
  readonly folderOnly: boolean;
  readonly pattern: RegExp;
}

// The rules of one ignore file, and the folder they apply to: a path relative to the repository's top that ends in `/`,
// or '' for the top itself.
export interface IgnoreFile {
  readonly base: string;
  readonly rules: readonly IgnoreRule[];
}

const escaped = (text: string): string => text.replaceAll(/[.*+?^${}()|[\]\\/]/g, '\\$&');

// Git's wildmatch: `**/` at the start or between slashes is any number of folders, `/**` at the end is everything
// below, any other run of `*` stays within one name, `?` is one character, `[...]` a class, and `\` escapes.
const globToken =
  /(?<folders>(?<=^|\/)\*\*\/)|(?<below>(?<=\/)\*\*$)|(?<name>\*+)|(?<one>\?)|\[(?<negated>[!^])?(?<members>\]?[^\]]*)\]|\\(?<literal>.)|(?<other>.)/gsu;

function globSource(glob: string): string {
  return [...glob.matchAll(globToken)]
    .map(({ groups = {} }) => {
      const { folders, below, name, one, negated, members, literal, other } = groups;

      if (folders !== undefined) {
        return '(?:.*/)?';
      }

      if (below !== undefined) {
        return '.*';
      }

      if (name !== undefined) {
        return '[^/]*';
      }

      if (one !== undefined) {
        return '[^/]';
      }

      if (members !== undefined) {
        return `[${negated === undefined ? '' : '^'}${members.replaceAll(/[\\\]^]/g, '\\$&')}]`;
      }

      return escaped(literal ?? other ?? '');
    })
    .join('');
}

// Git sets core.ignoreCase on the file systems of Windows and macOS when it creates a repository.
const flags = process.platform === 'win32' || process.platform === 'darwin' ? 'iu' : 'u';

function ruleOf(line: string): IgnoreRule | undefined {
  const text = line.replace(/(?<!\\) +$/, '');

  if (text === '' || text.startsWith('#')) {
    return undefined;
  }

  const negated = text.startsWith('!');
  const unprefixed = negated ? text.slice(1) : text;
  const folderOnly = unprefixed.endsWith('/');
  const glob = folderOnly ? unprefixed.slice(0, -1) : unprefixed;
  const anchored = glob.includes('/');
  const source = globSource(glob.startsWith('/') ? glob.slice(1) : glob);

  return { negated, folderOnly, pattern: new RegExp(anchored ? `^${source}$` : `(?:^|/)${source}$`, flags) };
}

export function ignoreRules(text: string): IgnoreRule[] {
  return text.split(/\r?\n/).flatMap((line) => ruleOf(line) ?? []);
}

// Git applies the ignore files from the top down, and within one file the last rule that matches decides.
export function isIgnored(files: readonly IgnoreFile[], path: string, isFolder: boolean): boolean {
  let ignored = false;

  for (const { base, rules } of files) {
    if (!path.startsWith(base)) {
      continue;
    }

    const below = path.slice(base.length);

    for (const rule of rules) {
      if ((isFolder || !rule.folderOnly) && rule.pattern.test(below)) {
        ignored = !rule.negated;
      }
    }
  }

  return ignored;
}
