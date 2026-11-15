// What the scrub decides, kept apart from the hooks so node:test covers it on Node.js 22 and 24.

// Same pattern as .claude/mods/oracle-guard/hooks/decide.ts; oracle-guard.test.ts guards the copy.
export const storePath = /(?<![A-Za-z0-9_-])\.oracle(?![A-Za-z0-9_-])/i;

// A line whose first token is a path inside the store, as find, ls -R, rg and Get-ChildItem print
// them. A line that only mentions the store further in, as this repository's docs do, is kept.
export const storeLine = /^\s*(?:Directory:\s*)?(?:[A-Za-z]:)?(?:[^\s:]*[\\/])?\.oracle[\\/:]/i;

// A store path anywhere in a line: inside a folder path or a quoted string, with a separator after it,
// as JSON output (rg --json) and cmd's `Directory of` headers print it; or a relative path that starts a
// space-separated token and goes on past the separator, as `wc -l` and space-joined lists print it.
// Docs write it as `.oracle/`, backticked or followed by a space, which neither form matches.
export const storeMention = /[\\/"]\.oracle[\\/]|(?:^|\s)\.oracle[\\/][^\s`]/i;

// Terminal colour codes, as `--color always` puts them in front of a path.
const colourCode = /\u001b\[[0-9;]*[A-Za-z]/g;

export const withheld =
  'oracle-scrub: this output listed paths inside the sealed store (.oracle/) and was withheld. Scope the command to the directory you mean instead of the repository root (AGENTS.md, "Oracle firewall").';

export const failClosed = { deny: 'oracle-scrub: its scrub failed, so the output was withheld.' } as const;

export function keep(line: string): boolean {
  return !storeLine.test(line);
}

export function listsStore(text: string): boolean {
  return text
    .replace(colourCode, '')
    .split(/\r?\n/)
    .some((line) => storeLine.test(line) || storeMention.test(line));
}

function field(result: unknown, key: 'stdout' | 'stderr'): string {
  if (typeof result !== 'object' || result === null) {
    return '';
  }

  const value: unknown = Object.entries(result).find(([name]) => name === key)?.[1];

  return typeof value === 'string' ? value : '';
}

export function shellOutput(text: string | undefined, result: unknown): string {
  return [text ?? '', field(result, 'stdout'), field(result, 'stderr')].join('\n');
}

// A call aimed at the store is the guard's to allow or deny; an oracle agent's own reads stay whole.
export function aimedAtStore(values: readonly unknown[]): boolean {
  return values.some((value) => typeof value === 'string' && storePath.test(value));
}
