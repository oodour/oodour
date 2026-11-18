import { test } from 'node:test';

// Every test here runs the real configs through the installed ESLint (`new ESLint({ overrideConfigFile: true,
// overrideConfig })`), because ESLint is what resolves rule IDs and validates options against each rule's schema.

test('recommended and recommended-type-checked load: every rule they turn on exists and accepts its options', () => {
  // calculateConfigForFile('file.ts') throws for an unknown rule or options the installed rule's schema rejects.
  throw new Error('not implemented');
});

test('each companion config loads once its plugin is registered', () => {
  // for each optional source: [{ plugins: { [namespace]: installed plugin } }, ...plugin.configs[sourceId]]
  throw new Error('not implemented');
});

test('recommended lints a TypeScript file with no type information', () => {
  // lintText with the typescript-eslint parser and no projectService: no fatal message, so no rule in the untyped
  // preset asked for parser services.
  throw new Error('not implemented');
});

test('the presets only ever warn or turn off', () => {
  // In every computed config, each severity is 0 or 1: cues are prompts to look, not gates.
  throw new Error('not implemented');
});

test('every rule in the registry is turned on by recommended-type-checked, and by recommended unless it needs types', () => {
  throw new Error('not implemented');
});

test('conflicts turns off exactly the rules the catalog marks as conflicts, and both recommended configs include it', () => {
  throw new Error('not implemented');
});
