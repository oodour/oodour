import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { join } from 'node:path';
import { test } from 'node:test';
import { trustDecision } from './trust-gate.ts';

const root = 'C:/plugins/oodour/1.0.0';
const script = `${root}/scripts/oodour.ts`;
const call = (command: string, mode = 'auto', tool = 'Bash'): string =>
  JSON.stringify({ permission_mode: mode, tool_name: tool, tool_input: { command } });

test('in auto mode the trusted command asks the developer', () => {
  assert.equal(trustDecision(call(`node ${script} --trusted-repository hotspots -- D:/repo`), root), 'ask');
});

test('in auto mode the untrusted command runs without asking', () => {
  assert.equal(trustDecision(call(`node ${script} hotspots -- D:/repo`), root), undefined);
});

test('in auto mode any other call of an oodour.ts asks, since its words could reach the CLI as the trust flag', () => {
  const commands = [
    `node ${script} hotspots -- D:/repo && node ${script} --trusted-repository hotspots -- D:/repo`,
    `node ${script} hotspots -- D:/repo; node ${script} --trusted-repository hotspots -- D:/repo`,
    `node ${script} hotspots -- $(echo D:/repo)`,
    `node ${script} hotspots -- D:/repo\nnode ${script} --trusted-repository hotspots -- D:/repo`,
    `node ${script} "--trusted"-repository hotspots -- D:/repo`,
    `node D:/repo/evil/scripts/oodour.ts hotspots -- D:/repo`,
    `FLAG=1 node ${script} hotspots -- D:/repo`,
    `xnode ${script} hotspots -- D:/repo`,
  ];

  assert.deepEqual(
    commands.map((command) => trustDecision(call(command), root)),
    commands.map(() => 'ask'),
  );
});

test('in auto mode a call that PowerShell or a line break could split into another command asks', () => {
  const trusted = `node ${script} --trusted-repository hotspots -- D:/repo`;
  const commands = [
    `node ${script} hotspots (${trusted})`,
    `node ${script} hotspots @(${trusted})`,
    `node ${script} hotspots -- D:/repo, (${trusted})`,
    `node ${script} hotspots { ${trusted} }`,
    `node\n${script} hotspots -- D:/repo`,
    `node ${script} hotspots\n${trusted}`,
    `node ${script} hotspots\r${trusted}`,
  ];

  assert.deepEqual(
    commands.map((command) => trustDecision(call(command), root)),
    commands.map(() => 'ask'),
  );
});

test('in auto mode the untrusted command passes with a quoted scope and the plugin path written with backslashes', () => {
  const backslashed = script.replaceAll('/', '\\');
  const calls = [
    call(`node ${script} hotspots --since "2 years ago" -- "D:/my repo"`),
    call(`node "${backslashed}" hotspots -- D:/repo`),
    call(`node ${backslashed} hotspots -- D:/repo`, 'auto', 'PowerShell'),
    call(`node ${script} hotspots --limit 50 -- packages/@org/lib`),
    call(`node ${script} hotspots`),
    call(` node  ${script}  hotspots -- D:/repo`),
  ];

  assert.deepEqual(
    calls.map((input) => trustDecision(input, root)),
    calls.map(() => undefined),
  );
});

test('in auto mode a Bash path whose backslashes Bash would remove or change asks, since Node then opens another file', () => {
  const backslashed = script.replaceAll('/', '\\');
  const commands = [
    `node ${backslashed} hotspots -- D:/repo`,
    `node C:\\plugins/oodour/1.0.0/scripts/oodour.ts hotspots -- D:/repo`,
    `node "${backslashed.replace('\\', '\\\\')}" hotspots -- D:/repo`,
  ];

  assert.deepEqual(
    commands.map((command) => trustDecision(call(command), root)),
    commands.map(() => 'ask'),
  );
});

test("without a plugin folder every call asks, since no script is then the plugin's own", () => {
  assert.equal(trustDecision(call('node /scripts/oodour.ts hotspots -- D:/repo'), ''), 'ask');
  assert.equal(trustDecision(call('node undefined/scripts/oodour.ts hotspots -- D:/repo'), undefined), 'ask');
});

test('input the hook cannot read asks, since the hook runs only for calls that name oodour.ts', () => {
  assert.deepEqual(
    [trustDecision(`{"tool_input": "node ${script} --trusted-repository hotspots`, root), trustDecision('not json', root)],
    ['ask', 'ask'],
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
        'oodour: a trusted audit lets Git, tests and linters start programs this repository names; allow it only if you trust the repository.',
    },
  });
});

test('outside auto mode the hook leaves the decision to the permission settings', () => {
  assert.equal(trustDecision(call(`node ${script} --trusted-repository hotspots -- D:/repo`, 'default'), root), undefined);
});
