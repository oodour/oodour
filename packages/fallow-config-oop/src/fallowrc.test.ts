import { execSync, spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { Ajv2020 } from 'ajv/dist/2020.js';
import { isRecord, presetValues, readmeValues } from './readme-values.ts';

const fallow = 'npx --yes fallow@3.43.2';
const fallowEnv = { ...process.env, FALLOW_TELEMETRY_DISABLED: '1', DO_NOT_TRACK: '1' };
const presetUrl = new URL('../fallowrc.json', import.meta.url);

function readJson(url: URL): unknown {
  return JSON.parse(readFileSync(url, 'utf8'));
}

function compileFallowSchema() {
  const schema: unknown = JSON.parse(execSync(`${fallow} config-schema`, { encoding: 'utf8', env: fallowEnv }));
  assert.ok(typeof schema === 'object' && schema !== null);

  return new Ajv2020({ strict: false, validateFormats: false, allErrors: true }).compile(schema);
}

describe('fallowrc.json', () => {
  it('is valid against the config schema of Fallow 3.43.2', () => {
    const validate = compileFallowSchema();

    const valid = validate(readJson(presetUrl));

    assert.deepEqual(validate.errors ?? [], []);
    assert.equal(valid, true);
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

  it('holds exactly the values the README table states', () => {
    const preset = readJson(presetUrl);
    assert.ok(isRecord(preset));

    const stated = readmeValues(readFileSync(new URL('../README.md', import.meta.url), 'utf8'));

    assert.deepEqual(stated, presetValues(preset));
  });
});

function complexityFindings(configFile: string): readonly (readonly unknown[])[] {
  const root = fileURLToPath(new URL('../fixtures/consumer/', import.meta.url));
  const run = spawnSync(`${fallow} health --root . --config ${configFile} --no-cache --format json --quiet`, {
    cwd: root,
    encoding: 'utf8',
    env: fallowEnv,
    shell: true,
  });
  const report: unknown = JSON.parse(run.stdout);
  assert.ok(isRecord(report) && Array.isArray(report['findings']), `no findings list in: ${run.stdout}${run.stderr}`);

  return report['findings'].map((finding: unknown) =>
    isRecord(finding) ? [finding['name'], finding['exceeded']] : [finding],
  );
}
