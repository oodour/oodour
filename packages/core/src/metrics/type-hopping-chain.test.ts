import assert from 'node:assert/strict';
import { join } from 'node:path';
import { describe, it } from 'node:test';
import { parseAndGenerateServices, simpleTraverse } from '@typescript-eslint/typescript-estree';
import ts from 'typescript';
import { measure, parseSource, type Source, typeHoppingChain } from '../index.ts';

/** A source with the types of a program that holds only this text, read from memory. */
function typedSource(text: string): Source {
  const file = join(process.cwd(), 'typed-source.ts').replaceAll('\\', '/');
  const host = ts.createCompilerHost({});
  const readSourceFile = host.getSourceFile.bind(host);
  const fileExists = host.fileExists.bind(host);

  host.getSourceFile = (name, ...rest) =>
    name === file ? ts.createSourceFile(name, text, ts.ScriptTarget.Latest, true) : readSourceFile(name, ...rest);
  host.fileExists = (name) => name === file || fileExists(name);

  const program = ts.createProgram([file], {}, host);
  const { ast, services } = parseAndGenerateServices(text, { filePath: file, programs: [program], loc: true, range: true });

  simpleTraverse(ast, { enter() {} }, true);

  return { file, text, ast, types: { program, esTreeNodeToTSNodeMap: services.esTreeNodeToTSNodeMap } };
}

/** Each chain the metric keeps, as its text and the number of types it steps through. */
function chains(text: string): [string, number][] {
  return measure(typedSource(text), [typeHoppingChain])
    .of(typeHoppingChain)
    .flatMap(({ value }) => value)
    .map(({ node, count }) => [text.slice(...node.range), count]);
}

const declarations = [
  'interface Address { city: string }',
  'interface Customer { address: Address; name: string }',
  'interface Order { customer: Customer }',
  'declare const order: Order;',
  'declare const names: Record<string, number>;',
].join('\n');

describe('typeHoppingChain', () => {
  it('has nothing to report without the types of a program', () => {
    const source = parseSource('order.customer.address.city;', 'file.ts');

    assert.ok(!('parseError' in source));
    assert.deepEqual(measure(source, [typeHoppingChain]).of(typeHoppingChain), []);
  });

  it('goes by its name', () => {
    assert.equal(typeHoppingChain.name, 'type-hopping-chain');
  });

  it('keeps a chain that steps through two or more types, with their number', () => {
    assert.deepEqual(chains(`${declarations}\norder.customer.address.city;\norder.customer.name;`), [
      ['order.customer.address.city', 3],
      ['order.customer.name', 2],
    ]);
  });

  it('has no measurement for a file whose chains stay on one type', () => {
    const source = typedSource(`${declarations}\norder.customer;`);

    assert.deepEqual(measure(source, [typeHoppingChain]).of(typeHoppingChain), []);
  });

  it('starts a chain of its own at a computed key', () => {
    assert.deepEqual(chains(`${declarations}\nnames[order.customer.name];`), [['order.customer.name', 2]]);
  });
});
