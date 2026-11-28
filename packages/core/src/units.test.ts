import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { maxParams, measure, parseSource, unitName } from './index.ts';

describe('unitName', () => {
  it('names an overload signature without a name, as an anonymous default export has', () => {
    const source = parseSource(
      'export default function (a: number): void;',
      'file.ts',
    );

    assert.ok(!('parseError' in source));
    assert.deepEqual(
      measure(source, [maxParams])
        .of(maxParams)
        .map(({ unit }) => `${unit.kind} ${unitName(unit)}`),
      ['declared-function Function'],
    );
  });
});
