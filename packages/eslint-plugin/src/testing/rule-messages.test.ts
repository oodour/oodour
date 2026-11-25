import assert from 'node:assert/strict';
import { test } from 'node:test';
import { presetMessages, ruleMessages } from './rule-messages.ts';

const fiveParameters = 'function f(a, b, c, d, e) {}';

test("ruleMessages returns only the named rule's messages when another rule of the preset reports too", () => {
  assert.equal(ruleMessages('max-params')(fiveParameters, { max: 4 }).length, 1);
  assert.deepEqual(ruleMessages('abc-size')(fiveParameters, { max: 100 }), []);
});

test("presetMessages returns only the named rule's messages when another rule of the preset reports too", () => {
  assert.equal(presetMessages('recommended', 'max-params', fiveParameters, 'f.ts').length, 1);
  assert.deepEqual(presetMessages('recommended', 'abc-size', fiveParameters, 'f.ts'), []);
});
