import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { tempDir } from '../temp-dir.ts';
import { test } from 'node:test';
import { assemble, createNodes, pluginTargets } from './claude-plugin.ts';

function writeTree(root: string, files: Readonly<Record<string, string>>): void {
  for (const [path, text] of Object.entries(files)) {
    mkdirSync(dirname(join(root, path)), { recursive: true });
    writeFileSync(join(root, path), text);
  }
}

test('assemble copies the plugin, puts its eval cases under evals/ without past results, and drops stale files', () => {
  const workspace = tempDir('assemble-');
  const plugin = join(workspace, 'plugin');
  const evals = join(workspace, 'evals');
  const out = join(workspace, 'out');
  writeTree(plugin, { '.claude-plugin/plugin.json': '{}', 'skills/a/SKILL.md': 'skill' });
  writeTree(evals, { 'case-a/prompt.md': 'prompt', 'results/run-1/result.json': '{}' });
  writeTree(out, { 'stale.md': 'old' });

  assemble(plugin, evals, out);

  assert.equal(readFileSync(join(out, 'skills/a/SKILL.md'), 'utf8'), 'skill');
  assert.equal(readFileSync(join(out, '.claude-plugin/plugin.json'), 'utf8'), '{}');
  assert.equal(readFileSync(join(out, 'evals/case-a/prompt.md'), 'utf8'), 'prompt');
  assert.equal(existsSync(join(out, 'evals/results')), false);
  assert.equal(existsSync(join(out, 'stale.md')), false);
});

const cli = join(import.meta.dirname, 'claude-plugin.ts');
const noFolders = (): boolean => false;

test('the assemble command assembles the folders it is given', () => {
  const workspace = tempDir('assemble-cli-');
  writeTree(workspace, { 'plugin/README.md': 'readme', 'evals/case-a/prompt.md': 'prompt' });

  const run = spawnSync(process.execPath, [cli, 'assemble', 'plugin', 'evals', 'out'], { cwd: workspace });

  assert.equal(run.status, 0);
  assert.equal(readFileSync(join(workspace, 'out/evals/case-a/prompt.md'), 'utf8'), 'prompt');
});

test('a missing folder, an extra argument or another command prints the usage and exits 2', () => {
  for (const args of [
    ['assemble', 'plugin'],
    ['assemble', 'plugin', 'evals', 'out', 'extra'],
    ['build', 'plugin', 'evals', 'out'],
  ]) {
    const run = spawnSync(process.execPath, [cli, ...args], { encoding: 'utf8' });

    assert.equal(run.status, 2, args.join(' '));
    assert.match(run.stderr, /usage: node tools\/nx\/claude-plugin\.ts assemble <plugin> <evals> <out>/);
  }
});

test('each plugin manifest becomes a project named after the plugin, with its Markdown files in the overlap check', async () => {
  const workspaceRoot = tempDir('nodes-');
  writeTree(workspaceRoot, {
    'plugins/demo/.claude-plugin/plugin.json': '{ "name": "demo" }',
    'plugins/demo/README.md': 'readme',
    'plugins/demo/skills/a/SKILL.md': 'skill',
    'plugins/demo/z.md': 'last',
    'plugins/demo/LICENSE': 'MIT',
  });
  const [pattern, infer] = createNodes;

  const results = await infer(['plugins/demo/.claude-plugin/plugin.json'], undefined, {
    workspaceRoot,
    nxJsonConfiguration: {},
  });

  assert.equal(pattern, 'plugins/*/.claude-plugin/plugin.json');
  const project = results[0]?.[1].projects?.['plugins/demo'];
  assert.equal(project?.name, 'demo');
  assert.equal(
    project.targets?.['overlap']?.command,
    'node tools/source-overlap.ts --min-words 6 plugins/demo/README.md plugins/demo/skills/a/SKILL.md plugins/demo/z.md',
  );
});

test("the overlap check also covers each of the plugin's eval case folders that exists", async () => {
  const workspaceRoot = tempDir('nodes-');
  writeTree(workspaceRoot, {
    'plugins/demo/.claude-plugin/plugin.json': '{ "name": "demo" }',
    'plugins/demo/README.md': 'readme',
    'evals/demo/case-a/prompt.md': 'prompt',
    'evals/demo-real/case-b/prompt.md': 'prompt',
  });

  const results = await createNodes[1](['plugins/demo/.claude-plugin/plugin.json'], undefined, {
    workspaceRoot,
    nxJsonConfiguration: {},
  });

  assert.equal(
    results[0]?.[1].projects?.['plugins/demo']?.targets?.['overlap']?.command,
    'node tools/source-overlap.ts --min-words 6 plugins/demo/README.md evals/demo evals/demo-real',
  );
});

test('an eval case folder that does not exist is left out of the overlap check', () => {
  const { overlap } = pluginTargets('plugins/demo', 'demo', ['plugins/demo/README.md'], (folder) => folder === 'evals/demo-real');

  assert.equal(overlap?.command, 'node tools/source-overlap.ts --min-words 6 plugins/demo/README.md evals/demo-real');
});

test("a plugin's scripts folder is type-checked, linted and tested, the tests cached on the Node.js version", () => {
  const targets = pluginTargets('plugins/demo', 'demo', [], (folder) => folder === 'plugins/demo/scripts');

  assert.equal(targets['typecheck']?.command, 'tsc -p plugins/demo/scripts/tsconfig.json');
  assert.equal(targets['lint']?.command, 'eslint plugins/demo/scripts');
  assert.equal(targets['test']?.command, 'node --test "plugins/demo/scripts/*.test.ts"');
  assert.equal(targets['test'].cache, true);
  assert.deepEqual(targets['test'].inputs, ['default', { externalDependencies: ['eslint', '@typescript-eslint/parser', 'typescript'] }, { runtime: 'node --version' }]);
  assert.deepEqual(targets['test'].outputs, []);
});

test('a plugin without a scripts folder gets no typecheck, lint or test target', () => {
  const targets = pluginTargets('plugins/demo', 'demo', [], noFolders);

  assert.deepEqual([targets['typecheck'], targets['lint'], targets['test']], [undefined, undefined, undefined]);
});

test('a manifest without a name is refused', () => {
  const workspaceRoot = tempDir('nodes-');
  writeTree(workspaceRoot, { 'plugins/demo/.claude-plugin/plugin.json': '{}' });

  assert.throws(
    () => createNodes[1](['plugins/demo/.claude-plugin/plugin.json'], undefined, { workspaceRoot, nxJsonConfiguration: {} }),
    /plugins\/demo\/\.claude-plugin\/plugin\.json names no plugin/,
  );
});

test('a plugin validates strictly with the Claude Code CLI', () => {
  const { validate } = pluginTargets('plugins/demo', 'demo', [], noFolders);

  assert.equal(validate?.command, 'claude plugin validate --strict plugins/demo');
  assert.equal(validate.cache, true);
  assert.deepEqual(validate.inputs, ['default', { runtime: 'claude --version' }]);
  assert.deepEqual(validate.outputs, []);
});

test('every Markdown file of a plugin is checked against the store at the six-word floor, never from cache', () => {
  const { overlap } = pluginTargets('plugins/demo', 'demo', ['plugins/demo/README.md', 'plugins/demo/skills/a/SKILL.md'], noFolders);

  assert.equal(
    overlap?.command,
    'node tools/source-overlap.ts --min-words 6 plugins/demo/README.md plugins/demo/skills/a/SKILL.md',
  );
  assert.equal(overlap.cache, false);
});

test('every Markdown file of a plugin is checked for citations, cached on the files and the checker', () => {
  const { citations } = pluginTargets('plugins/demo', 'demo', ['plugins/demo/README.md', 'plugins/demo/z.md'], noFolders);

  assert.equal(citations?.command, 'node tools/citations.ts plugins/demo/README.md plugins/demo/z.md');
  assert.equal(citations.cache, true);
  assert.deepEqual(citations.inputs, ['default', '{workspaceRoot}/tools/citations.ts']);
  assert.deepEqual(citations.outputs, []);
});

test('pre-eval assembles the plugin and its eval cases outside the distributed plugin, cached on both', () => {
  const preEval = pluginTargets('plugins/demo', 'demo', [], noFolders)['pre-eval'];

  assert.equal(preEval?.command, 'node tools/nx/claude-plugin.ts assemble plugins/demo evals/demo dist/eval/demo');
  assert.equal(preEval.cache, true);
  assert.deepEqual(preEval.inputs, [
    'default',
    '{workspaceRoot}/evals/demo/**/*',
    '!{workspaceRoot}/evals/demo/results/**/*',
    '{workspaceRoot}/tools/nx/claude-plugin.ts',
  ]);
  assert.deepEqual(preEval.outputs, ['{workspaceRoot}/dist/eval/demo']);
});

test('eval runs the assembled copy after pre-eval and is never cached', () => {
  const { eval: evaluate } = pluginTargets('plugins/demo', 'demo', [], noFolders);

  assert.equal(evaluate?.command, 'claude plugin eval dist/eval/demo');
  assert.deepEqual(evaluate.dependsOn, ['pre-eval']);
  assert.equal(evaluate.cache, false);
});

test('pre-eval-real assembles the plugin with its real-repository cases beside the synthetic suite, cached on both', () => {
  const preEvalReal = pluginTargets('plugins/demo', 'demo', [], noFolders)['pre-eval-real'];

  assert.equal(preEvalReal?.command, 'node tools/nx/claude-plugin.ts assemble plugins/demo evals/demo-real dist/eval/demo-real');
  assert.equal(preEvalReal.cache, true);
  assert.deepEqual(preEvalReal.inputs, [
    'default',
    '{workspaceRoot}/evals/demo-real/**/*',
    '!{workspaceRoot}/evals/demo-real/results/**/*',
    '{workspaceRoot}/tools/nx/claude-plugin.ts',
  ]);
  assert.deepEqual(preEvalReal.outputs, ['{workspaceRoot}/dist/eval/demo-real']);
});

test('eval-real runs the real-repository suite with its scaffold scripts after pre-eval-real, never cached', () => {
  const evalReal = pluginTargets('plugins/demo', 'demo', [], noFolders)['eval-real'];

  assert.equal(evalReal?.command, 'claude plugin eval dist/eval/demo-real --scaffold');
  assert.deepEqual(evalReal.dependsOn, ['pre-eval-real']);
  assert.equal(evalReal.cache, false);
});
