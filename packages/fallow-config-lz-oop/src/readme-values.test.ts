import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { presetValues, readmeValues } from './readme-values.ts';

describe('presetValues', () => {
  it('lists nothing for an empty config', () => {
    const values = presetValues({});

    assert.deepEqual(values, []);
  });

  it('lists a top-level key with its value as JSON text', () => {
    const values = presetValues({ minimumVersion: '3.43.2' });

    assert.deepEqual(values, [['minimumVersion', '"3.43.2"']]);
  });

  it('lists a nested key by its dotted path', () => {
    const values = presetValues({ health: { maxCyclomatic: 10, changeCoupling: { minDegree: 0.25 } } });

    assert.deepEqual(values, [
      ['health.maxCyclomatic', '10'],
      ['health.changeCoupling.minDegree', '0.25'],
    ]);
  });

  it('leaves out the editor-only $schema key', () => {
    const values = presetValues({ $schema: 'https://example.test/schema.json', minimumVersion: '3.43.2' });

    assert.deepEqual(values, [['minimumVersion', '"3.43.2"']]);
  });
});

describe('readmeValues', () => {
  it('lists nothing for a values table with no rows', () => {
    const markdown = ['<!-- preset-values:start -->', '| Key | Value |', '| --- | --- |', '<!-- preset-values:end -->'];

    const values = readmeValues(markdown.join('\n'));

    assert.deepEqual(values, []);
  });

  it('lists the key and value cells of a row in the table', () => {
    const markdown = [
      '| `health.maxCyclomatic` | `20` | outside the table |',
      '<!-- preset-values:start -->',
      '| Key | Value | Why |',
      '| --- | --- | --- |',
      '| `health.maxCyclomatic` | `10` | a reason |',
      '<!-- preset-values:end -->',
    ];

    const values = readmeValues(markdown.join('\n'));

    assert.deepEqual(values, [['health.maxCyclomatic', '10']]);
  });

  it('throws when the README has no preset-values table', () => {
    const markdown = '| `health.maxCyclomatic` | `10` | a reason |';

    assert.throws(() => readmeValues(markdown), /preset-values/);
  });

  it('throws when the table has a start marker and no end marker', () => {
    const markdown = ['<!-- preset-values:start -->', '| `health.maxCyclomatic` | `10` | a reason |'];

    assert.throws(() => readmeValues(markdown.join('\n')), /preset-values/);
  });
});
