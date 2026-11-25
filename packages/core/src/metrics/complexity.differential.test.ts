import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { describe, it } from 'node:test';
import { Linter, type Rule } from 'eslint';
import { builtinRules } from 'eslint/use-at-your-own-risk';
import * as parser from '@typescript-eslint/parser';
import { complexity, measure, parseSource, unitName } from '../index.ts';

const workspace = join(import.meta.dirname, '../../../..');
const corpusFolders = ['packages', 'plugins/oodour/scripts', 'tools'];

/** Every TypeScript file in the corpus folders, skipping installed and built output. */
function corpus(): string[] {
  return corpusFolders.flatMap((folder) =>
    readdirSync(join(workspace, folder), { recursive: true, encoding: 'utf8' })
      .filter((path) => /\.[cm]?tsx?$/.test(path) && !/(^|[\\/])(node_modules|dist)[\\/]/.test(path))
      .map((path) => join(workspace, folder, path)),
  );
}

/** What ESLint's own `complexity` rule reports, the first report per node, as the rule's consumers keep it. */
function eslintUnits(file: string, text: string): string[] {
  // eslint-disable-next-line @typescript-eslint/no-deprecated -- ESLint 10 has no other route to a core rule's module
  const rule = builtinRules.get('complexity');

  if (!rule?.meta) {
    throw new Error("ESLint's complexity rule could not be loaded.");
  }

  const units: string[] = [];
  const reported = new Set<unknown>();
  const count = (descriptor: Rule.ReportDescriptor): void => {
    const node = 'node' in descriptor ? descriptor.node : undefined;

    if (node?.loc && !reported.has(node)) {
      reported.add(node);
      units.push(
        `${String(node.loc.start.line)}:${String(node.loc.start.column)} ${String(descriptor.data?.['name'])}: ${String(descriptor.data?.['complexity'])}`,
      );
    }
  };
  const counting: Rule.RuleModule = {
    meta: rule.meta,
    create(context) {
      // ESLint freezes the context, so an object that inherits from it shadows `report` instead.
      const listening: unknown = Object.create(context, { report: { value: count } });

      if (!isRuleContext(listening)) {
        throw new Error('The listening context lost the rule context it inherits from.');
      }

      return rule.create(listening);
    },
  };
  const fatal = new Linter({ cwd: workspace })
    .verify(
      text,
      [
        {
          files: ['**'],
          languageOptions: { parser },
          linterOptions: { noInlineConfig: true },
          plugins: { metrics: { rules: { complexity: counting } } },
          rules: { 'metrics/complexity': ['error', 0] },
        },
      ],
      relative(workspace, file),
    )
    .find((message) => message.fatal === true);

  return fatal ? [`parse error ${String(fatal.line)}:${String(fatal.column)}`] : units.sort(byPosition);
}

function coreUnits(file: string, text: string): string[] {
  const source = parseSource(text, file);

  if ('parseError' in source) {
    return [`parse error ${/:(\d+:\d+) /.exec(source.parseError)?.[1] ?? source.parseError}`];
  }

  return measure(source, [complexity])
    .of(complexity)
    .map(({ unit, value }) => {
      const { line, column } = unit.node.loc.start;

      return `${String(line)}:${String(column)} ${unitName(unit)}: ${String(value)}`;
    })
    .sort(byPosition);
}

function isRuleContext(value: unknown): value is Rule.RuleContext {
  return typeof value === 'object' && value !== null && 'report' in value && 'sourceCode' in value;
}

function byPosition(a: string, b: string): number {
  return a.localeCompare(b, 'en', { numeric: true });
}

describe("complexity against ESLint's complexity rule", () => {
  it('gives every unit of the workspace the same node, name and count', () => {
    const files = corpus();
    const compared = files.map((file) => {
      const text = readFileSync(file, 'utf8');

      return { file: relative(workspace, file), eslint: eslintUnits(file, text), core: coreUnits(file, text) };
    });
    const units = compared.reduce((total, { eslint }) => total + eslint.length, 0);
    const kinds = new Set(compared.flatMap(({ eslint }) => eslint.map((unit) => /^\S+ (\S+)/.exec(unit)?.[1])));

    assert.ok(units > 1000, `ESLint reported ${String(units)} units over ${String(files.length)} files`);
    assert.ok(kinds.has('Arrow') && kinds.has('Method') && kinds.has('Getter'), [...kinds].join(', '));
    assert.deepEqual(
      compared.filter(({ eslint, core }) => eslint.join('\n') !== core.join('\n')),
      [],
    );
  });

  it('gives class fields, static blocks and nested functions the same units, which the workspace lacks', () => {
    const text = `
      class A {
        x = this.a ?? 1;
        static y = A.x ? () => 1 : (b = 2) => b || 3;
        #run = (a) => a?.b ?? 1;
        accessor f = function named() { return this.x && 1; };
        static #z = 0;
        'q' = 1;
        static {
          if (A.x) { for (const k of []) {} }
          const g = () => { try {} catch {} };
        }
        [Symbol.iterator] = function* () { yield 1; };
        m(c = 1) { return { n() { return c ||= 2; } }; }
        accessor g = this.x ?? 1;
      }
      const B = class { static { while (B) {} } };
      const k = 'key';
      const o = {
        [k]: function named() { return k && 1; },
        [/re/g]() {},
        1n() {},
        [\`t\`]() {},
        [\`t\${k}\`]: function other() {},
        null() {},
        get [k]() { return 1; },
      };`;
    const eslint = eslintUnits(join(workspace, 'classes.ts'), text);

    assert.ok(eslint.length >= 10, eslint.join('\n'));
    assert.deepEqual(coreUnits('classes.ts', text), eslint);
  });

  it('reports a parse error where ESLint does', () => {
    const text = 'function f( {\n  return 1;\n}\n';
    const eslint = eslintUnits(join(workspace, 'broken.ts'), text);

    assert.match(eslint[0] ?? '', /^parse error \d+:\d+$/);
    assert.deepEqual(coreUnits('broken.ts', text), eslint);
  });
});
