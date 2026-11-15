// What the scrub decides, kept apart from the hooks so node:test covers it on Node.js 22 and 24.

// Same pattern as .claude/hooks/oracle-guard.ts; oracle-guard.test.ts guards the copy.
export const storePath = /(^|[\\/"'\s=:])\.oracle([\\/"'\s]|$)/i;

// A line whose first token is a path inside the store, as find, ls -R, rg and Get-ChildItem print
// them. A line that only mentions the store further in, as this repository's docs do, is kept.
export const storeLine = /^\s*(?:Directory:\s*)?(?:[A-Za-z]:)?(?:[^\s:]*[\\/])?\.oracle[\\/:]/i;

export const withheld =
  'oracle-scrub: this output listed paths inside the sealed store (.oracle/) and was withheld. Scope the command to the directory you mean instead of the repository root (AGENTS.md, "Oracle firewall").';

export const failClosed = { deny: 'oracle-scrub: its scrub failed, so the output was withheld.' } as const;

export function keep(line: string): boolean {
  return !storeLine.test(line);
}

export function listsStore(text: string): boolean {
  return text.split(/\r?\n/).some((line) => storeLine.test(line));
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
