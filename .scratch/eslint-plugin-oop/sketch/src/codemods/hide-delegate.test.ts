import assert from 'node:assert/strict';
import { test } from 'node:test';
import { inMemoryProject, sourceTexts } from '../testing/in-memory-project.ts';
import { hideDelegate } from './hide-delegate.ts';

// The shape of every codemod test: files in, one `apply`, files out. Three cases at least: it changes what it
// should, it refuses what it cannot change safely, and a second run on its own output refuses.

const before = {
  'customer.ts': 'export class Customer {\n  constructor(readonly address: Address) {}\n}\n',
  'invoice.ts': 'export function cityOf(customer: Customer): string {\n  return customer.address.city.name;\n}\n',
};

test('adds the delegating method to the class and calls it where the chain was', () => {
  const project = inMemoryProject(before);

  const outcome = hideDelegate.apply(project, { file: 'invoice.ts', line: 2 });

  assert.deepEqual(outcome, { outcome: 'changed', files: ['customer.ts', 'invoice.ts'] });
  assert.deepEqual(sourceTexts(project), {
    'customer.ts': 'TODO: the class with the new method',
    'invoice.ts': 'TODO: the function calling it',
  });
});

test('refuses when the receiver is not a class declared in the project, and changes nothing', () => {
  const project = inMemoryProject({ 'invoice.ts': 'declare const today: Date;\ntoday.toISOString().length;\n' });

  const outcome = hideDelegate.apply(project, { file: 'invoice.ts', line: 2 });

  assert.equal(outcome.outcome, 'refused');
  assert.deepEqual(sourceTexts(project), { 'invoice.ts': 'declare const today: Date;\ntoday.toISOString().length;\n' });
});

test('a second run at the same target refuses', () => {
  const project = inMemoryProject(before);
  hideDelegate.apply(project, { file: 'invoice.ts', line: 2 });
  const afterFirstRun = sourceTexts(project);

  const outcome = hideDelegate.apply(project, { file: 'invoice.ts', line: 2 });

  assert.equal(outcome.outcome, 'refused');
  assert.deepEqual(sourceTexts(project), afterFirstRun);
});
