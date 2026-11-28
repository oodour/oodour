import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, matchesGlob } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { parse } from 'yaml';

// mutation.yml shares some Stryker configurations out between jobs, each with its own --mutate patterns. Nothing but
// this test keeps those patterns a partition of the configuration's own `mutate` list.

interface Shard {
  readonly target: string;
  readonly config: string;
  readonly patterns: readonly string[];
}

const root = dirname(fileURLToPath(import.meta.url));

function field(value: unknown, key: string): unknown {
  return typeof value === 'object' && value !== null && key in value
    ? Object.getOwnPropertyDescriptor(value, key)?.value
    : undefined;
}

function shardOf(entry: unknown): Shard | undefined {
  const target = field(entry, 'target');
  const config = field(entry, 'config');
  const mutate = field(entry, 'mutate');

  if (
    typeof target !== 'string' ||
    typeof config !== 'string' ||
    typeof mutate !== 'string'
  ) {
    return undefined;
  }

  return { target, config, patterns: mutate.split(',') };
}

function shards(): readonly Shard[] {
  const workflow: unknown = parse(
    readFileSync(`${root}/.github/workflows/mutation.yml`, 'utf8'),
  );
  const include = field(
    field(
      field(field(field(workflow, 'jobs'), 'stryker'), 'strategy'),
      'matrix',
    ),
    'include',
  );

  assert.ok(Array.isArray(include), 'mutation.yml has a matrix of jobs');

  return include.flatMap((entry: unknown) => shardOf(entry) ?? []);
}

// Loaded in a child process without LZ_NODE_TEST_RUNNER: with it set, as in the mutation workflow, a configuration loads
// lz-node-test's mutators, which load only under lz-node-test's own export condition.
function ownPatterns(config: string): readonly string[] {
  const env = Object.fromEntries(
    Object.entries(process.env).filter(
      ([name]) => name !== 'LZ_NODE_TEST_RUNNER',
    ),
  );
  const script = `const { default: config } = await import(${JSON.stringify(new URL(config, import.meta.url).href)}); console.log(JSON.stringify(config.mutate));`;
  const mutate: unknown = JSON.parse(
    execFileSync(process.execPath, ['--input-type=module', '--eval', script], {
      cwd: root,
      env,
      encoding: 'utf8',
    }),
  );

  assert.ok(
    Array.isArray(mutate) &&
      mutate.every((pattern) => typeof pattern === 'string'),
    `${config} lists the files it mutates`,
  );

  return mutate;
}

function takes(patterns: readonly string[], file: string): boolean {
  return (
    patterns.some(
      (pattern) => !pattern.startsWith('!') && matchesGlob(file, pattern),
    ) &&
    !patterns.some(
      (pattern) =>
        pattern.startsWith('!') && matchesGlob(file, pattern.slice(1)),
    )
  );
}

// Read from the folders, not from Git: Stryker runs this test in a sandbox copy that Git ignores.
const sources = ['packages', 'plugins'].flatMap((folder) =>
  readdirSync(`${root}/${folder}`, { recursive: true, encoding: 'utf8' })
    .map((file) => `${folder}/${file.replaceAll('\\', '/')}`)
    .filter(
      (file) =>
        file.endsWith('.ts') &&
        !/\/(?:node_modules|dist|coverage)\//.test(file),
    ),
);

// A file added later must land in a shard too: a name for every first letter, in every folder a shard reads and in a
// folder below it.
function withNewNames(files: readonly string[]): readonly string[] {
  const folders = new Set(files.map((file) => dirname(file)));
  const letters = Array.from({ length: 26 }, (_, index) =>
    String.fromCharCode('a'.charCodeAt(0) + index),
  );
  const made = [...folders].flatMap((folder) =>
    letters.flatMap((letter) => [
      `${folder}/${letter}new.ts`,
      `${folder}/${letter}new.test.ts`,
      `${folder}/sub/${letter}new.ts`,
    ]),
  );

  return [...new Set([...files, ...made])];
}

const byConfig = Map.groupBy(shards(), (shard) => shard.config);

test('mutation.yml shares out at least one configuration', () => {
  assert.ok(byConfig.size > 0);
});

for (const [config, configShards] of byConfig) {
  test(`every file ${config} mutates lands in exactly one of its shards, and no other file in any`, () => {
    const own = ownPatterns(config);
    const candidates = withNewNames(
      sources.filter(
        (file) =>
          takes(own, file) ||
          configShards.some((shard) => takes(shard.patterns, file)),
      ),
    );
    const wrong = candidates.flatMap((file) => {
      const hits = configShards
        .filter((shard) => takes(shard.patterns, file))
        .map((shard) => shard.target);
      const expected = takes(own, file) ? 1 : 0;

      return hits.length === expected
        ? []
        : [`${file}: ${hits.length === 0 ? 'no shard' : hits.join(', ')}`];
    });

    assert.ok(
      candidates.some((file) => takes(own, file)),
      `${config} mutates a file that exists`,
    );
    assert.deepEqual(wrong, []);
  });
}
