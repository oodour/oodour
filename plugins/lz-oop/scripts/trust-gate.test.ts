import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { join } from 'node:path';
import { test } from 'node:test';
import { trustDecision } from './trust-gate.ts';

const root = 'C:/plugins/lz-oop/1.0.0';
const script = `${root}/scripts/lz-oop.ts`;
const call = (command: string, mode = 'auto'): string =>
  JSON.stringify({ permission_mode: mode, tool_name: 'Bash', tool_input: { command } });

test('in auto mode the trusted command asks the developer', () => {
  assert.equal(trustDecision(call(`node ${script} --trusted-repository hotspots -- D:/repo`), root), 'ask');
});

test('in auto mode the untrusted command runs without asking', () => {
  assert.equal(trustDecision(call(`node ${script} hotspots -- D:/repo`), root), undefined);
});

test('in auto mode any other call of an lz-oop.ts asks, since its words could reach the CLI as the trust flag', () => {
  const commands = [
    `node ${script} hotspots -- D:/repo && node ${script} --trusted-repository hotspots -- D:/repo`,
    `node ${script} hotspots -- D:/repo; node ${script} --trusted-repository hotspots -- D:/repo`,
    `node ${script} hotspots -- $(echo D:/repo)`,
    `node ${script} hotspots -- D:/repo\nnode ${script} --trusted-repository hotspots -- D:/repo`,
    `node ${script} "--trusted"-repository hotspots -- D:/repo`,
    `node D:/repo/evil/scripts/lz-oop.ts hotspots -- D:/repo`,
    `FLAG=1 node ${script} hotspots -- D:/repo`,
  ];

  assert.deepEqual(
    commands.map((command) => trustDecision(call(command), root)),
    commands.map(() => 'ask'),
  );
});

test('in auto mode the untrusted command passes with a quoted scope and the plugin path written with backslashes', () => {
  const commands = [`node ${script} hotspots --since "2 years ago" -- "D:/my repo"`, `node ${script.replaceAll('/', '\\')} hotspots -- D:/repo`];

  assert.deepEqual(
    commands.map((command) => trustDecision(call(command), root)),
    [undefined, undefined],
  );
});

test('input the hook cannot read asks when it holds the trust flag, and leaves the decision otherwise', () => {
  assert.deepEqual(
    [trustDecision(`{"tool_input": "node ${script} --trusted-repository hotspots`, root), trustDecision('not json', root)],
    ['ask', undefined],
  );
});

test('run as a hook, it prints an ask with its reason for the trusted command and nothing for the untrusted one', () => {
  const run = (command: string) =>
    spawnSync(process.execPath, [join(import.meta.dirname, 'trust-gate.ts')], {
      input: call(command),
      encoding: 'utf8',
      env: { ...process.env, CLAUDE_PLUGIN_ROOT: root },
    });
  const trusted = run(`node ${script} --trusted-repository hotspots -- D:/repo`);
  const untrusted = run(`node ${script} hotspots -- D:/repo`);

  assert.deepEqual([trusted.status, untrusted.status, untrusted.stdout], [0, 0, '']);
  assert.deepEqual(JSON.parse(trusted.stdout), {
    hookSpecificOutput: {
      hookEventName: 'PreToolUse',
      permissionDecision: 'ask',
      permissionDecisionReason:
        'lz-oop: a trusted audit lets Git, tests and linters start programs this repository names; allow it only if you trust the repository.',
    },
  });
});

test('outside auto mode the hook leaves the decision to the permission settings', () => {
  assert.equal(trustDecision(call(`node ${script} --trusted-repository hotspots -- D:/repo`, 'default'), root), undefined);
});
