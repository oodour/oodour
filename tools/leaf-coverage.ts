// Checks that every reference leaf of the plugin has an eval case whose leaf-read grader asks for that leaf alone:
// a grader that accepts any of several leaves passes when the route reads one, so it proves none of them.

export function leafReadPattern(grader: string): string {
  const quoted = /^input_match: '((?:[^']|'')*)'/m.exec(grader)?.[1];

  if (quoted === undefined) {
    throw new Error('leaf-read grader has no single-quoted input_match');
  }

  return quoted.replaceAll("''", "'");
}

export function uncoveredLeaves(
  leaves: readonly string[],
  patterns: readonly string[],
): string[] {
  const matched = (pattern: string): string[] =>
    leaves.filter((leaf) => new RegExp(pattern).test(`references/${leaf}.md`));
  const covered = new Set(
    patterns
      .map(matched)
      .filter((names) => names.length === 1)
      .flat(),
  );

  return leaves.filter((leaf) => !covered.has(leaf));
}
