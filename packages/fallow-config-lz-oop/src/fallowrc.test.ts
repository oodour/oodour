import { execSync, spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { Ajv2020 } from 'ajv/dist/2020.js';
import { isRecord, presetValues, readmeValues } from './readme-values.ts';

const fallow = 'npx --yes fallow@3.43.2';
// Fallow settings from the caller's environment would change results that the Nx cache hash cannot see.
const fallowEnv = {
  ...Object.fromEntries(Object.entries(process.env).filter(([name]) => !name.startsWith('FALLOW_'))),
  FALLOW_TELEMETRY_DISABLED: '1',
  DO_NOT_TRACK: '1',
};
const presetUrl = new URL('../fallowrc.json', import.meta.url);
const strictPresetUrl = new URL('../strict.json', import.meta.url);

// The test-file globs of eslint-plugin-lz-oop's `testFileGlobs`, without its declaration-file glob: change both together.
const testFiles = ['**/*.test.*', '**/*.spec.*', '**/__tests__/**', '**/test/**', '**/tests/**', '**/spec/**', '**/e2e/**'];
// One file under each of the globs above.
const testFilePaths = [
  'cart.test.ts',
  'cart.spec.ts',
  '__tests__/cart.ts',
  'test/cart.ts',
  'tests/cart.ts',
  'spec/cart.ts',
  'e2e/cart.ts',
];

function readJson(url: URL): unknown {
  return JSON.parse(readFileSync(url, 'utf8'));
}

function compileFallowSchema() {
  const schema: unknown = JSON.parse(execSync(`${fallow} config-schema`, { encoding: 'utf8', env: fallowEnv }));
  assert.ok(typeof schema === 'object' && schema !== null);

  return new Ajv2020({ strict: false, validateFormats: false, allErrors: true }).compile(schema);
}

describe('fallowrc.json and strict.json', () => {
  it('are valid against the config schema of Fallow 3.43.2', () => {
    const validate = compileFallowSchema();

    const errors = [presetUrl, strictPresetUrl].map((url) => (validate(readJson(url)) ? [] : validate.errors));

    assert.deepEqual(errors, [[], []]);
  });

  it('would fail that check for a value the schema rules out', () => {
    const validate = compileFallowSchema();

    const valid = validate({ health: { changeCoupling: { minDegree: 2 } } });

    assert.equal(valid, false);
  });

  it('reports a function of cyclomatic complexity 11 to a consumer that extends it, and not without it', () => {
    const consumerFindings = complexityFindings('.fallowrc.json');
    const bareFindings = complexityFindings('no-preset.json');

    assert.deepEqual(consumerFindings, [['classify', 'cyclomatic_crap']]);
    assert.deepEqual(bareFindings, [['classify', 'crap']]);
  });

  it('leaves file length unchecked, while strict reports a 300-line source file and no 300-line test file', (t) => {
    const lines = Array.from({ length: 300 }, (_, index) => `export const value${String(index)} = ${String(index)};`).join('\n');
    const files = Object.fromEntries(['big.ts', ...testFilePaths].map((path) => [path, `${lines}\n`]));
    const root = scratchProject(t, 'file-length-', files);

    const findings = ['fallowrc.json', 'strict.json'].map((preset) =>
      complexityReport(root, consumerConfig(root, preset, files)).map((finding) => [finding['path'], finding['exceeded']]),
    );

    assert.deepEqual(findings, [[], [['big.ts', 'file_lines']]]);
  });

  it('scores CRAP in source files only, in both presets', (t) => {
    const classify = readFileSync(new URL('../fixtures/consumer/classify.js', import.meta.url), 'utf8');
    const files = Object.fromEntries(['classify.ts', ...testFilePaths].map((path) => [path, classify]));
    const root = scratchProject(t, 'crap-', files);
    // Limits above the function's complexity leave CRAP the only check it can fail.
    const loose = { health: { maxCyclomatic: 20, maxCognitive: 50 } };

    const findings = ['fallowrc.json', 'strict.json'].map((preset) =>
      complexityReport(root, consumerConfig(root, preset, files, loose)).map((finding) => [
        finding['path'],
        finding['exceeded'],
      ]),
    );

    assert.deepEqual(findings, [[['classify.ts', 'crap']], [['classify.ts', 'crap']]]);
  });

  it('reports duplicated code in source files only', (t) => {
    const body = [
      'export function slug(input: string): string {',
      '  const trimmed = input.trim();',
      '  const lowered = trimmed.toLowerCase();',
      "  const compact = lowered.replaceAll(' ', '-');",
      "  const again = compact.replaceAll('_', '-');",
      "  const more = again.replaceAll('.', '-');",
      '  return more + trimmed + lowered;',
      '}',
      '',
    ].join('\n');
    const files = Object.fromEntries(
      ['a.ts', 'b.ts', ...testFilePaths, ...testFilePaths.map((path) => `other/${path}`)].map((path) => [path, body]),
    );
    const root = scratchProject(t, 'duplicates-', files);
    const run = spawnSync(
      `${fallow} dupes --root . --config ${consumerConfig(root, 'fallowrc.json', files)} --no-cache --format json --quiet`,
      { cwd: root, encoding: 'utf8', env: fallowEnv, shell: true },
    );
    const report: unknown = JSON.parse(run.stdout);
    assert.ok(isRecord(report) && Array.isArray(report['clone_groups']), `no clone groups in: ${run.stdout}${run.stderr}`);

    const instances = report['clone_groups']
      .filter(isRecord)
      .flatMap((group) => (Array.isArray(group['instances']) ? group['instances'].filter(isRecord) : []))
      .map((instance) => instance['file']);

    assert.deepEqual(instances, ['a.ts', 'b.ts']);
  });

  it('leaves out of each production-only check the same test files', () => {
    const base = readJson(presetUrl);
    const strict = readJson(strictPresetUrl);

    assert.deepEqual(
      [
        pathOf(base, 'duplicates', 'ignore'),
        pathOf(base, 'overrides', 0, 'files'),
        pathOf(strict, 'health', 'thresholdOverrides', 0, 'files'),
      ],
      [testFiles, testFiles, testFiles],
    );
  });

  it('holds exactly the values the README tables state', () => {
    const readme = readFileSync(new URL('../README.md', import.meta.url), 'utf8');
    const presets = [presetUrl, strictPresetUrl].map((url) => readJson(url));
    assert.ok(presets.every(isRecord));

    const stated = ['preset-values', 'strict-preset-values'].map((marker) => readmeValues(readme, marker));

    assert.deepEqual(stated, presets.map(presetValues));
  });
});

function scratchProject(t: { after: (fn: () => void) => void }, prefix: string, files: Readonly<Record<string, string>>): string {
  const root = mkdtempSync(fileURLToPath(new URL(`../fixtures/${prefix}`, import.meta.url)));
  t.after(() => {
    rmSync(root, { recursive: true });
  });

  for (const [path, text] of Object.entries(files)) {
    mkdirSync(dirname(join(root, path)), { recursive: true });
    writeFileSync(join(root, path), text);
  }

  return root;
}

/** Writes a consumer config that extends `preset` and lists every file as an entry; returns its file name. */
function consumerConfig(
  root: string,
  preset: string,
  files: Readonly<Record<string, string>>,
  extra: Readonly<Record<string, unknown>> = {},
): string {
  const name = `${preset.replace('.json', '')}.consumer.json`;
  writeFileSync(join(root, name), JSON.stringify({ extends: `../../${preset}`, entry: Object.keys(files), ...extra }));

  return name;
}

function pathOf(value: unknown, ...keys: readonly (string | number)[]): unknown {
  return keys.reduce<unknown>((current, key) => {
    if (typeof key === 'number') {
      return Array.isArray(current) ? current[key] : undefined;
    }

    return isRecord(current) ? current[key] : undefined;
  }, value);
}

function complexityFindings(configFile: string): readonly (readonly unknown[])[] {
  const root = fileURLToPath(new URL('../fixtures/consumer/', import.meta.url));

  return complexityReport(root, configFile).map((finding) => [finding['name'], finding['exceeded']]);
}

function complexityReport(root: string, configFile: string): readonly Readonly<Record<string, unknown>>[] {
  const run = spawnSync(`${fallow} health --root . --config ${configFile} --no-cache --format json --quiet`, {
    cwd: root,
    encoding: 'utf8',
    env: fallowEnv,
    shell: true,
  });
  const report: unknown = JSON.parse(run.stdout);
  assert.ok(isRecord(report) && Array.isArray(report['findings']), `no findings list in: ${run.stdout}${run.stderr}`);

  return report['findings'].filter(isRecord);
}
