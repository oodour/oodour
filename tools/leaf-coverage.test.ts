import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import { leafReadPattern, uncoveredLeaves } from './leaf-coverage.ts';

test('with no leaf-read grader, every leaf is uncovered', () => {
  assert.deepEqual(uncoveredLeaves(['inheritance', 'test-first'], []), ['inheritance', 'test-first']);
});

test('a leaf-read grader that names one leaf covers that leaf', () => {
  assert.deepEqual(uncoveredLeaves(['inheritance', 'test-first'], ['references[\\\\/]+inheritance\\.md']), ['test-first']);
});

test('a grader file gives its single-quoted input_match as the pattern', () => {
  const grader = ['---', 'type: tool_used', 'tool: Read', "input_match: 'references[\\\\/]+it''s\\.md'", 'arm: with-only', '---', '', 'Text.', ''].join('\n');

  assert.equal(leafReadPattern(grader), "references[\\\\/]+it's\\.md");
});

test('a YAML comment after the quoted pattern is not part of it', () => {
  assert.equal(leafReadPattern("---\ninput_match: 'references[\\\\/]+inheritance\\.md' # one leaf\n---\n"), 'references[\\\\/]+inheritance\\.md');
});

test('an input_match in the middle of a line is not the key', () => {
  assert.throws(() => leafReadPattern("---\nnote: input_match: 'x'\n---\n"), /no single-quoted input_match/);
});

test('a grader file without a single-quoted input_match is refused', () => {
  assert.throws(() => leafReadPattern('---\ntype: tool_used\ninput_match: "x"\n---\n'), /no single-quoted input_match/);
});

test('in the real eval cases, every reference leaf of the plugin has a case that asks for it alone', () => {
  const root = join(import.meta.dirname, '..');
  const leaves = readdirSync(join(root, 'plugins/lz-oop/references'))
    .filter((file) => file.endsWith('.md'))
    .map((file) => file.slice(0, -'.md'.length));
  const patterns = ['evals/lz-oop', 'evals/lz-oop-real'].flatMap((suite) =>
    readdirSync(join(root, suite))
      .map((name) => join(root, suite, name, 'graders', 'leaf-read.md'))
      .filter((file) => existsSync(file))
      .map((file) => leafReadPattern(readFileSync(file, 'utf8'))),
  );

  assert.ok(leaves.length > 0 && patterns.length > 0, 'found no leaves or no leaf-read graders');
  assert.deepEqual(uncoveredLeaves(leaves, patterns), []);
});

test('a grader that accepts any of several leaves covers none of them', () => {
  assert.deepEqual(uncoveredLeaves(['inheritance', 'test-first'], ['references[\\\\/]+(?:inheritance|test-first)\\.md']), ['inheritance', 'test-first']);
});
