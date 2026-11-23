import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, realpathSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { test } from 'node:test';
import { type FileMeasures, measureScope, rankHotspots, renderHotspots } from './hotspots.ts';

/** A repository with one commit per entry, each writing its files. */
function repository(commits: readonly Readonly<Record<string, string>>[]): string {
  const root = realpathSync.native(mkdtempSync(join(tmpdir(), 'lz-oop-hotspots-')));
  const git = (args: readonly string[]): void => {
    execFileSync('git', ['-c', 'user.name=lz-oop', '-c', 'user.email=lz-oop', ...args], { cwd: root });
  };
  git(['init', '-q']);

  for (const files of commits) {
    for (const [file, text] of Object.entries(files)) {
      mkdirSync(dirname(join(root, file)), { recursive: true });
      writeFileSync(join(root, file), text);
    }

    git(['add', '.']);
    git(['commit', '-q', '-m', 'change']);
  }

  return root;
}

function measures(file: string, values: Partial<FileMeasures> = {}): FileMeasures {
  return {
    file,
    commits: 0,
    dependents: { production: 0, test: 0 },
    largest: undefined,
    concrete: false,
    namedClasses: [],
    ...values,
  };
}

const largest = (complexity: number) => ({ name: "Function 'f'", line: 1, complexity });

test('a file at or above the thresholds of commits and complexity is changed and complex', () => {
  const { rows } = rankHotspots([measures('a.ts', { commits: 3, largest: largest(6) })], 30);

  assert.deepEqual(
    rows.map(({ file, quadrant }) => [file, quadrant]),
    [['a.ts', 'changed and complex']],
  );
});

test('often changed means at least the 75th percentile of commits among files with one, and at least 2', () => {
  const files = [1, 2, 3, 4, 0].map((commits, index) => measures(`${String(index)}.ts`, { commits, largest: largest(9) }));

  const { thresholds, rows } = rankHotspots(files, 30);

  assert.equal(thresholds.commits, 3);
  assert.deepEqual(
    rows.filter(({ quadrant }) => quadrant === 'changed and complex').map(({ file }) => file),
    ['3.ts', '2.ts'],
  );
});

test("complex means a largest function at least the 75th percentile of the files', and above the limit of 4", () => {
  const complexities = [2, 4, 6, 8, undefined];
  const files = complexities.map((complexity, index) =>
    measures(`${String(index)}.ts`, { commits: 5, largest: complexity === undefined ? undefined : largest(complexity) }),
  );

  const { thresholds, rows } = rankHotspots(files, 30);

  assert.equal(thresholds.complexity, 6);
  assert.deepEqual(
    rows.filter(({ quadrant }) => quadrant === 'changed and complex').map(({ file }) => file),
    ['3.ts', '2.ts'],
  );
  assert.equal(rankHotspots([measures('a.ts', { largest: largest(3) })], 30).thresholds.complexity, 5);
});

test('a complex file that is not often changed is complex, unchanged', () => {
  const files = [measures('changed.ts', { commits: 4, largest: largest(9) }), measures('kept.ts', { largest: largest(9) })];

  assert.deepEqual(
    rankHotspots(files, 30).rows.map(({ file, quadrant }) => [file, quadrant]),
    [
      ['changed.ts', 'changed and complex'],
      ['kept.ts', 'complex, unchanged'],
    ],
  );
});

test('a file a tenth of the files depend on is depended on when it changes often or holds a concrete class', () => {
  const others = Array.from({ length: 17 }, (_, index) => measures(`other-${String(index)}.ts`));
  const files = [
    measures('store.ts', { dependents: { production: 2, test: 9 }, concrete: true }),
    measures('util.ts', { dependents: { production: 2, test: 0 }, commits: 4 }),
    measures('port.ts', { dependents: { production: 5, test: 0 } }),
    ...others,
  ];

  const { thresholds, rows } = rankHotspots(files, 30);

  assert.equal(thresholds.dependents, 2);
  assert.deepEqual(
    rows.filter(({ quadrant }) => quadrant === 'depended on').map(({ file }) => file),
    ['util.ts', 'store.ts'],
  );
});

test('the rows list the files to audit first by quadrant, then the rest by commits, up to the limit', () => {
  const files = [
    measures('busy.ts', { commits: 9, largest: largest(1) }),
    measures('kept.ts', { commits: 1, largest: largest(9) }),
    measures('hot.ts', { commits: 4, largest: largest(9) }),
    measures('store.ts', { commits: 1, dependents: { production: 2, test: 0 }, concrete: true }),
    measures('quiet.ts', { commits: 1 }),
  ];

  assert.deepEqual(
    rankHotspots(files, 4).rows.map(({ file }) => file),
    ['hot.ts', 'store.ts', 'busy.ts', 'kept.ts'],
  );
  assert.deepEqual(
    rankHotspots(files, 1).rows.map(({ file }) => file),
    ['hot.ts', 'store.ts'],
  );
});

test("measuring a scope joins each production file's commits, dependents, largest function and classes", () => {
  const root = repository([
    {
      'src/store.ts': 'export class Store {\n  get(a: number) {\n    return a > 0 ? a : 0;\n  }\n}',
      'src/app.ts': "import { Store } from './index';\nexport const store = new Store();",
      'src/app.test.ts': "import { Store } from './store';",
      'src/index.ts': "export * from './store';",
    },
    { 'src/store.ts': 'export class Store {\n  get(a: number) {\n    return a > 1 ? a : 1;\n  }\n}' },
  ]);

  const measured = measureScope(root, '12 months ago');

  assert.deepEqual(measured.files, [
    {
      file: 'src/app.ts',
      commits: 1,
      dependents: { production: 0, test: 0 },
      largest: undefined,
      concrete: false,
      namedClasses: ['Store'],
    },
    {
      file: 'src/store.ts',
      commits: 2,
      dependents: { production: 1, test: 1 },
      largest: { name: "Method 'get'", line: 2, complexity: 2 },
      concrete: true,
      namedClasses: [],
    },
  ]);
  assert.deepEqual(measured.reexportsOnly, ['src/index.ts']);
});

test('the report states the period, the history, the thresholds and what was left out above the table', () => {
  const files = [
    measures('src/store.ts', {
      commits: 3,
      dependents: { production: 1, test: 2 },
      largest: { name: "Method 'get'", line: 2, complexity: 7 },
      concrete: true,
      namedClasses: ['Clock', 'Ledger'],
    }),
    measures('src/port.ts'),
  ];
  const measured = { files, history: 'shallow' as const, reexportsOnly: ['src/index.ts'], notParsed: ['src/x.ts:1:9 Oops'] };

  assert.equal(
    renderHotspots('src', '12 months ago', measured, rankHotspots(files, 30)),
    [
      'Hot spots in src: 2 production files, commits since 12 months ago.',
      'History: a shallow clone, so the commit counts are too low.',
      'Thresholds: often changed at 3 commits or more (the 75th percentile, at least 2); ' +
        'complex at a largest function of 7 or more (the 75th percentile, above 4); ' +
        'many dependents at 2 production files or more (a tenth, at least 2).',
      'Left out, only re-exporting: src/index.ts.',
      'Left out, not parsed: src/x.ts:1:9 Oops.',
      '',
      '| File | Commits | Dependents (production, test) | Largest function | Exports a concrete class | Concrete classes it names | Quadrant |',
      '| --- | ---: | --- | --- | --- | --- | --- |',
      "| src/store.ts | 3 | 1, 2 | Method 'get', line 2: 7 | yes | Clock, Ledger | changed and complex |",
      '| src/port.ts | 0 | 0, 0 | none | no | none | simple |',
      '',
    ].join('\n'),
  );
});

test('a file the parser cannot read is left out and named with where it stopped', () => {
  const root = repository([{ 'a.ts': 'export const a = 1;', 'broken.ts': 'function (\n' }]);

  const { files, notParsed } = measureScope(root, '12 months ago');

  assert.deepEqual(
    files.map(({ file }) => file),
    ['a.ts'],
  );
  assert.match(notParsed.join('\n'), /^broken\.ts:1:\d+ /);
});

test('outside a repository the files have no commits and the history is none', (context) => {
  const root = realpathSync.native(mkdtempSync(join(tmpdir(), 'lz-oop-no-history-')));
  writeFileSync(join(root, 'a.ts'), 'export const a = 1;');
  // Git looks for a repository in every folder above, and the temporary folder could sit in one.
  process.env['GIT_CEILING_DIRECTORIES'] = tmpdir();
  context.after(() => {
    delete process.env['GIT_CEILING_DIRECTORIES'];
  });

  const { files, history } = measureScope(root, '12 months ago');

  assert.deepEqual([history, files.map(({ commits }) => commits)], ['none', [undefined]]);
});
