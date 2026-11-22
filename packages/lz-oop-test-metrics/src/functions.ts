import { dirname, resolve } from 'node:path';
import { type JSSyntaxElement, Linter, type Rule } from 'eslint';
import { builtinRules } from 'eslint/use-at-your-own-risk';
import * as parser from '@typescript-eslint/parser';

/** A place in a source file: a line from 1 and a column from 0, as ESLint counts them. */
export interface Position {
  readonly line: number;
  readonly column: number;
}

/** A stretch of source, from its first character to just past its last. */
export interface Range {
  readonly start: Position;
  readonly end: Position;
}

/** Whether the first position comes before the second in the source. */
export function isBefore(a: Position, b: Position): boolean {
  return a.line < b.line || (a.line === b.line && a.column < b.column);
}

/** Whether the inner stretch starts no earlier and ends no later than the outer one. */
export function within(inner: Range, outer: Range): boolean {
  return !isBefore(inner.start, outer.start) && !isBefore(outer.end, inner.end);
}

/**
 * A function as ESLint's `complexity` rule sees it: its name and count, where it starts, and where its body starts.
 * Class field initializers and static blocks count as functions of their own, as the rule counts them.
 */
export interface FunctionSite {
  readonly name: string;
  readonly complexity: number;
  readonly start: Position;
  readonly bodyStart: Position;
  /** Just past its last character. */
  readonly end: Position;
  /** A method or accessor other objects may send: not `#private`, TypeScript `private` or `protected`, or a constructor. */
  readonly publicMethod: boolean;
}

const functionTypes = new Set(['ArrowFunctionExpression', 'FunctionDeclaration', 'FunctionExpression']);

/** Every function in the source, each with the complexity ESLint's `complexity` rule gives it. */
export function functionsIn(file: string, source: string): FunctionSite[] {
  // eslint-disable-next-line @typescript-eslint/no-deprecated -- ESLint 10 has no other route to a core rule's module
  const complexity = builtinRules.get('complexity');

  if (!complexity?.meta) {
    throw new Error("ESLint's complexity rule could not be loaded.");
  }

  const sites: FunctionSite[] = [];
  const reported = new Set<ReturnType<typeof nodeOf>>();
  // A class field whose value is a function is reported for the function, then for the initializer, on one node.
  const count = (descriptor: Rule.ReportDescriptor) => {
    const node = nodeOf(descriptor);

    if (!reported.has(node)) {
      reported.add(node);
      sites.push(siteOf(descriptor));
    }
  };
  const counting: Rule.RuleModule = {
    meta: complexity.meta,
    create(context) {
      // ESLint freezes the context, so an object that inherits from it shadows `report` instead.
      const listening: unknown = Object.create(context, { report: { value: count } });

      if (!isRuleContext(listening)) {
        throw new Error('The listening context lost the rule context it inherits from.');
      }

      return complexity.create(listening);
    },
  };

  // ESLint matches `files` against the path below its cwd, so a file outside the run's folder would match no config.
  const fatal = new Linter({ cwd: dirname(resolve(file)) }).verify(
    source,
    [
      {
        files: ['**'],
        languageOptions: { parser },
        plugins: { metrics: { rules: { complexity: counting } } },
        rules: { 'metrics/complexity': ['error', 0] },
      },
    ],
    file,
  ).find((message) => message.fatal === true);

  // The counting rule reports through `sites`, never as a message; the other messages are notes on disable comments.
  if (fatal) {
    throw new Error(`${file}:${String(fatal.line)}:${String(fatal.column)} ${fatal.message}`);
  }

  return sites;
}

function nodeOf(descriptor: Rule.ReportDescriptor) {
  return 'node' in descriptor ? descriptor.node : undefined;
}

function siteOf(descriptor: Rule.ReportDescriptor): FunctionSite {
  const node = nodeOf(descriptor);
  const name = descriptor.data?.['name'];
  const complexity = descriptor.data?.['complexity'];

  if (!node?.loc || typeof name !== 'string' || typeof complexity !== 'number') {
    throw new Error("ESLint's complexity rule reported without a located function node, a name or a count.");
  }

  const variable = name.includes("'") ? undefined : variableHolding(node);

  return {
    name: variable === undefined ? name : `${name} '${variable}'`,
    complexity,
    start: positionOf(node.loc.start),
    bodyStart: positionOf((bodyOf(node).loc ?? node.loc).start),
    end: positionOf(node.loc.end),
    publicMethod: isPublicMethod(node),
  };
}

function isPublicMethod(node: JSSyntaxElement): boolean {
  const parent: unknown = 'parent' in node ? node.parent : undefined;

  return (
    isSyntaxElement(parent) &&
    parent.type === 'MethodDefinition' &&
    'kind' in parent &&
    parent.kind !== 'constructor' &&
    'key' in parent &&
    isSyntaxElement(parent.key) &&
    parent.key.type !== 'PrivateIdentifier' &&
    !('accessibility' in parent && (parent.accessibility === 'private' || parent.accessibility === 'protected'))
  );
}

/** The name of the variable the function is the value of, as in `const double = (n) => n * 2`. */
function variableHolding(node: JSSyntaxElement): string | undefined {
  const parent: unknown = 'parent' in node ? node.parent : undefined;

  if (!isSyntaxElement(parent) || parent.type !== 'VariableDeclarator' || !('id' in parent)) {
    return undefined;
  }

  const { id } = parent;

  return isSyntaxElement(id) && 'name' in id && typeof id.name === 'string' ? id.name : undefined;
}

/** A function's body, or the node itself for a class field initializer or static block, which is its own body. */
function bodyOf(node: JSSyntaxElement): JSSyntaxElement {
  return functionTypes.has(node.type) && 'body' in node && isSyntaxElement(node.body) ? node.body : node;
}

function isSyntaxElement(value: unknown): value is JSSyntaxElement {
  return typeof value === 'object' && value !== null && 'type' in value && typeof value.type === 'string';
}

function isRuleContext(value: unknown): value is Rule.RuleContext {
  return typeof value === 'object' && value !== null && 'report' in value && 'sourceCode' in value;
}

function positionOf({ line, column }: Position): Position {
  return { line, column };
}
