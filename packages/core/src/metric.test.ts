import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { complexity, defineMetric, measure, parseSource, type Source, unitName } from './index.ts';

function sourceOf(text: string): Source {
  const source = parseSource(text, 'file.ts');

  if ('parseError' in source) {
    throw new Error(source.parseError);
  }

  return source;
}

/** Records, per function, every node it enters and leaves, with the slot each fills. */
const trace = defineMetric({
  name: 'trace',
  needs: 'syntax',
  units: ['function'],
  open: (): { events: string[] } => ({ events: [] }),
  enter: (node, state, at) => {
    state.events.push(`>${node.type}@${at.key ?? '-'}`);
  },
  leave: (node, state) => {
    state.events.push(`<${node.type}`);
  },
  close: ({ events }) => (events.length === 0 ? undefined : events.join(' ')),
});

describe('measure', () => {
  it('opens a unit before its node is entered and closes it after the node is left', () => {
    const measured = measure(sourceOf('c ? 1 : () => 2;'), [trace]).of(trace);

    assert.deepEqual(
      measured.map(({ value }) => value),
      ['>ArrowFunctionExpression@alternate >Literal@body <Literal <ArrowFunctionExpression'],
    );
  });

  it('gives each node to the innermost open unit only', () => {
    const measured = measure(sourceOf('function f() { return () => 1; }'), [trace]).of(trace);

    assert.deepEqual(
      measured.map(({ value }) => value),
      [
        '>FunctionDeclaration@body >Identifier@id <Identifier >BlockStatement@body >ReturnStatement@body ' +
          '<ReturnStatement <BlockStatement <FunctionDeclaration',
        '>ArrowFunctionExpression@argument >Literal@body <Literal <ArrowFunctionExpression',
      ],
    );
  });

  it('gives a node inside a unit kind the metric does not measure to the unit around it', () => {
    const measured = measure(sourceOf('function f() { class A { x = g(); } }'), [trace]).of(trace);

    assert.deepEqual(
      measured.map(({ unit }) => unitName(unit)),
      ["Function 'f'"],
    );
    assert.match(measured[0]?.value ?? '', />CallExpression@value/);
  });

  it('opens both units of a class that is a field value, the field initializer first, and closes them in reverse', () => {
    const events: string[] = [];
    const order = defineMetric({
      name: 'order',
      needs: 'syntax',
      units: ['field-initializer', 'class'],
      open: (unit) => {
        events.push(`open ${unitName(unit)}`);
      },
      close: (_state, unit) => {
        events.push(`close ${unitName(unit)}`);

        return undefined;
      },
    });

    measure(sourceOf('class A { b = class B {}; }'), [order]);

    assert.deepEqual(events, [
      "open Class 'A'",
      'open Class field initializer',
      "open Class 'B'",
      "close Class 'B'",
      'close Class field initializer',
      "close Class 'A'",
    ]);
  });

  it('names an anonymous class', () => {
    const classes = defineMetric({
      name: 'classes',
      needs: 'syntax',
      units: ['class'],
      open: () => undefined,
      close: () => 1,
    });

    assert.deepEqual(
      measure(sourceOf('const A = class {};'), [classes])
        .of(classes)
        .map(({ unit }) => unitName(unit)),
      ['Anonymous class'],
    );
  });

  it('feeds several metrics from one walk', () => {
    const measured = measure(sourceOf('function f(a) { return a ?? 1; }'), [trace, complexity]);

    assert.deepEqual(
      measured.of(complexity).map(({ value }) => value),
      [2],
    );
    assert.equal(measured.of(trace).length, 1);
  });

  it('refuses to read a metric the walk did not measure', () => {
    const measured = measure(sourceOf('function f() {}'), [trace]);

    assert.throws(() => measured.of(complexity), { message: "The metric 'complexity' was not measured in this run." });
  });
});
