import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
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

async function ownPatterns(config: string): Promise<readonly string[]> {
  const options: unknown = field(
    await import(new URL(config, import.meta.url).href),
    'default',
  );
  const mutate = field(options, 'mutate');

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

const tracked = execFileSync('git', ['ls-files', '--', '*.ts'], {
  cwd: root,
  encoding: 'utf8',
})
  .split('\n')
  .filter((file) => file !== '');

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
  test(`every file ${config} mutates lands in exactly one of its shards, and no other file in any`, async () => {
    const own = await ownPatterns(config);
    const candidates = withNewNames(
      tracked.filter(
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
      `${config} mutates a tracked file`,
    );
    assert.deepEqual(wrong, []);
  });
}
