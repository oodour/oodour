import assert from 'node:assert/strict';
import { mkdirSync, symlinkSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import {
  folderWith,
  outsideAnyRepository,
  partialCloneOf,
  repositoryWith,
  writeFiles,
} from './fixtures.ts';
import {
  type FileMeasures,
  type Measured,
  measureScope,
  rankHotspots,
  renderHotspots,
} from './hotspots.ts';

function measures(
  file: string,
  values: Partial<FileMeasures> = {},
): FileMeasures {
  return {
    file,
    commits: 0,
    dependents: { production: 0, test: 0 },
    largest: undefined,
    exportsConcreteClass: false,
    concreteClassesNamed: [],
    ...values,
  };
}

const largest = (complexity: number) => ({
  name: "Function 'f'",
  line: 1,
  complexity,
});

test('a file at or above the thresholds of commits and complexity is changed and complex', () => {
  const { rows } = rankHotspots(
    [measures('a.ts', { commits: 3, largest: largest(6) })],
    30,
  );

  assert.deepEqual(
    rows.map(({ file, quadrant }) => [file, quadrant]),
    [['a.ts', 'changed and complex']],
  );
});

test('often changed means at least the 75th percentile of commits among files with one, and at least 2', () => {
  const files = [1, 2, 3, 4, 0].map((commits, index) =>
    measures(`${String(index)}.ts`, { commits, largest: largest(9) }),
  );

  const { thresholds, rows } = rankHotspots(files, 30);

  assert.equal(thresholds.commits, 3);
  assert.deepEqual(
    rows
      .filter(({ quadrant }) => quadrant === 'changed and complex')
      .map(({ file }) => file),
    ['3.ts', '2.ts'],
  );
});

test("complex means a largest function at least the 75th percentile of the files', and at least 5", () => {
  const complexities = [2, 4, 6, 8, undefined];
  const files = complexities.map((complexity, index) =>
    measures(`${String(index)}.ts`, {
      commits: 5,
      largest: complexity === undefined ? undefined : largest(complexity),
    }),
  );

  const { thresholds, rows } = rankHotspots(files, 30);

  assert.equal(thresholds.complexity, 6);
  assert.deepEqual(
    rows
      .filter(({ quadrant }) => quadrant === 'changed and complex')
      .map(({ file }) => file),
    ['3.ts', '2.ts'],
  );
  assert.equal(
    rankHotspots([measures('a.ts', { largest: largest(3) })], 30).thresholds
      .complexity,
    5,
  );
});

test('files with no commits do not lower the threshold of often changed', () => {
  const files = [0, 0, 0, 0, 0, 4, 8].map((commits, index) =>
    measures(`${String(index)}.ts`, { commits }),
  );

  assert.equal(rankHotspots(files, 30).thresholds.commits, 8);
});

test('the percentile is the value at the rank counted up from the smallest, whatever order the files come in', () => {
  const files = Array.from({ length: 35 }, (_, index) =>
    measures(`${String(index)}.ts`, { commits: ((index * 13) % 35) + 1 }),
  );

  assert.equal(rankHotspots(files, 30).thresholds.commits, 27);
});

test('files with the same commits list the more complex first, and a file with no function last', () => {
  const files = [
    measures('none.ts', { commits: 1 }),
    measures('simple.ts', { commits: 1, largest: largest(1) }),
  ];

  assert.deepEqual(
    rankHotspots(files, 30).rows.map(({ file }) => file),
    ['simple.ts', 'none.ts'],
  );
});

test('a complex file that is not often changed is complex, seldom changed', () => {
  const files = [
    measures('changed.ts', { commits: 4, largest: largest(9) }),
    measures('kept.ts', { largest: largest(9) }),
  ];

  assert.deepEqual(
    rankHotspots(files, 30).rows.map(({ file, quadrant }) => [file, quadrant]),
    [
      ['changed.ts', 'changed and complex'],
      ['kept.ts', 'complex, seldom changed'],
    ],
  );
});

test('a file a tenth of the files depend on is depended on when it changes often or holds a concrete class', () => {
  const others = Array.from({ length: 17 }, (_, index) =>
    measures(`other-${String(index)}.ts`),
  );
  const files = [
    measures('store.ts', {
      dependents: { production: 2, test: 9 },
      exportsConcreteClass: true,
    }),
    measures('util.ts', { dependents: { production: 2, test: 0 }, commits: 4 }),
    measures('port.ts', { dependents: { production: 5, test: 0 } }),
    ...others,
  ];

  const { thresholds, rows } = rankHotspots(files, 30);

  assert.equal(thresholds.dependents, 2);
  assert.deepEqual(
    rows
      .filter(({ quadrant }) => quadrant === 'depended on')
      .map(({ file }) => file),
    ['util.ts', 'store.ts'],
  );
});

test('the rows list the files to audit first by quadrant, then the rest by commits, up to the limit', () => {
  const files = [
    measures('busy.ts', { commits: 9, largest: largest(1) }),
    measures('kept.ts', { commits: 1, largest: largest(9) }),
    measures('hot.ts', { commits: 4, largest: largest(9) }),
    measures('store.ts', {
      commits: 1,
      dependents: { production: 2, test: 0 },
      exportsConcreteClass: true,
    }),
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

test("measuring a scope joins each production file's commits, dependents, largest function and classes", (context) => {
  const root = repositoryWith(context, [
    {
      'src/store.ts':
        'export class Store {\n  get(a: number) {\n    return a > 0 ? a : 0;\n  }\n}',
      'src/app.ts':
        "import { Store } from './index';\nexport const store = new Store();",
      'src/app.test.ts': "import { Store } from './store';",
      'src/store.test.ts': "import { Store } from './store';",
      'src/index.ts': "export * from './store';",
    },
    {
      'src/store.ts':
        'export class Store {\n  get(a: number) {\n    return a > 1 ? a : 1;\n  }\n}',
    },
  ]);
  writeFiles(root, { 'src/draft.ts': 'export const draft = 1;' });

  const measured = measureScope(root, '12 months ago', true);

  assert.deepEqual(
    measured.files.toSorted((a, b) => a.file.localeCompare(b.file)),
    [
      {
        file: 'src/app.ts',
        commits: 1,
        dependents: { production: 0, test: 0 },
        largest: undefined,
        exportsConcreteClass: false,
        concreteClassesNamed: ['Store'],
      },
      {
        file: 'src/draft.ts',
        commits: 0,
        dependents: { production: 0, test: 0 },
        largest: undefined,
        exportsConcreteClass: false,
        concreteClassesNamed: [],
      },
      {
        file: 'src/store.ts',
        commits: 2,
        dependents: { production: 1, test: 2 },
        largest: { name: "Method 'get'", line: 2, complexity: 2 },
        exportsConcreteClass: true,
        concreteClassesNamed: [],
      },
    ],
  );
  assert.deepEqual(measured.reexportsOnly, ['src/index.ts']);
});

test('the report states the period, the history, the thresholds and what was left out above the table', () => {
  const files = [
    measures('src/store.ts', {
      commits: 3,
      dependents: { production: 1, test: 2 },
      largest: { name: "Method 'get'", line: 2, complexity: 7 },
      exportsConcreteClass: true,
      concreteClassesNamed: ['Clock', 'Ledger'],
    }),
    measures('src/port.ts', { concreteClassesNamed: ['Clock'] }),
  ];
  const measured = {
    files,
    history: ['shallow', 'partial'] as const,
    reexportsOnly: ['src/index.ts', 'src/api.ts'],
    parseErrors: ['src/x.ts:1:9 Oops.', 'src/y.ts:2:1 Oops.'],
    skipped: ['linked', 'other'],
    ignored: undefined,
  };

  assert.equal(
    renderHotspots('src', '12 months ago', measured, rankHotspots(files, 30)),
    [
      'Hot spots in src: 2 production files, commits since 12 months ago.',
      'History: a shallow clone, so the commit counts are too low; ' +
        "a partial clone, so renames are not followed and a renamed file's older commits count for its old path.",
      'Thresholds: often changed at 3 commits or more (the 75th percentile, at least 2); ' +
        'complex at a largest function of 7 or more (the 75th percentile, at least 5); ' +
        'many dependents at 2 production files or more (one in 10, at least 2).',
      'Left out, only re-exporting: src/index.ts, src/api.ts.',
      'Left out, not parsed: src/x.ts:1:9 Oops.; src/y.ts:2:1 Oops.',
      'Left out, not entered (links, folders it may not list, names ending in a dot or a space, other repositories): linked, other.',
      '',
      '| File | Commits | Dependents (production, test) | Largest function | Exports a concrete class | Concrete classes it names | Quadrant |',
      '| --- | ---: | --- | --- | --- | --- | --- |',
      "| src/store.ts | 3 | 1, 2 | Method 'get', line 2: 7 | yes | Clock, Ledger | changed and complex |",
      '| src/port.ts | 0 | 0, 0 | none | no | Clock | simple |',
      '',
    ].join('\n'),
  );
});

test('the report adds a left-out line only for a list with entries, and names a single entry', () => {
  const aboveTable = (
    lists: Pick<Measured, 'reexportsOnly' | 'parseErrors'>,
  ): string[] | undefined =>
    renderHotspots(
      'src',
      '12 months ago',
      { files: [], history: [], skipped: [], ignored: undefined, ...lists },
      rankHotspots([], 30),
    )
      .split('\n\n')[0]
      ?.split('\n')
      .slice(3);

  assert.deepEqual(aboveTable({ reexportsOnly: [], parseErrors: [] }), []);
  assert.deepEqual(
    aboveTable({
      reexportsOnly: ['src/index.ts'],
      parseErrors: ['src/x.ts:1:9 Oops.'],
    }),
    [
      'Left out, only re-exporting: src/index.ts.',
      'Left out, not parsed: src/x.ts:1:9 Oops.',
    ],
  );
});

test("a file's largest function is the first of its most complex ones", (context) => {
  const root = folderWith(context, {
    'a.ts': [
      'export function one() {',
      '  return 1;',
      '}',
      'export function two(a: boolean) {',
      '  return a ? 1 : 0;',
      '}',
      'export function three(a: boolean) {',
      '  return a ? 1 : 0;',
      '}',
    ].join('\n'),
  });
  outsideAnyRepository(context);

  assert.deepEqual(
    measureScope(root, '12 months ago', false).files.map(
      ({ largest }) => largest,
    ),
    [{ name: "Function 'two'", line: 4, complexity: 2 }],
  );
});

test('a file the parser cannot read is left out and named with where it stopped', (context) => {
  const root = repositoryWith(context, [
    { 'a.ts': 'export const a = 1;', 'broken.ts': 'function (\n' },
  ]);

  const { files, parseErrors } = measureScope(root, '12 months ago', true);

  assert.deepEqual(
    files.map(({ file }) => file),
    ['a.ts'],
  );
  assert.match(parseErrors.join('\n'), /^broken\.ts:1:\d+ /);
});

test('outside a repository there is no history and the report shows no commit counts', (context) => {
  const root = folderWith(context, { 'a.ts': 'export const a = 1;' });
  outsideAnyRepository(context);

  const measured = measureScope(root, '12 months ago', true);
  const report = renderHotspots(
    root,
    '12 months ago',
    measured,
    rankHotspots(measured.files, 30),
  );

  assert.equal(measured.history, 'no repository');
  assert.deepEqual(
    measured.files.map(({ commits }) => commits),
    [0],
  );
  assert.match(
    report,
    /\nHistory: no Git repository, or git is not installed, so no commit counts, and no file counts as often changed\.\n/,
  );
  assert.match(report, /\n\| a\.ts \| - \| 0, 0 \|/);
});

test('a folder not trusted is still named as outside any repository when no .git is above it', (context) => {
  const root = folderWith(context, { 'lib/a.ts': 'export const a = 1;' });
  outsideAnyRepository(context);

  assert.deepEqual(
    [
      measureScope(join(root, 'lib'), '12 months ago', false).history,
      measureScope(repositoryWith(context, []), '12 months ago', false).history,
    ],
    ['no repository', 'untrusted'],
  );
});

test('the report names what the walk did not enter, so the reader leaves it unread', (context) => {
  const outside = folderWith(context, { 'x.ts': 'export const x = 1;' });
  const root = folderWith(context, { 'a.ts': 'export const a = 1;' });
  symlinkSync(outside, join(root, 'linked'), 'junction');
  outsideAnyRepository(context);

  const measured = measureScope(root, '12 months ago', false);

  assert.match(
    renderHotspots(
      root,
      '12 months ago',
      measured,
      rankHotspots(measured.files, 30),
    ),
    /\nLeft out, not entered \(links, folders it may not list, names ending in a dot or a space, other repositories\): linked\.\n/,
  );
});

const ignoredBy =
  'Left out, ignored by \\.gitignore files and \\.git/info/exclude, committed files too \\(the global excludes file, ' +
  "core\\.excludesFile, and a linked work tree's exclude file are not read\\): ";

test('a listing that applied ignore files names the folders they left out, also when Git could not run on a trusted folder', (context) => {
  const root = folderWith(context, {
    '.gitignore': 'dist/\n',
    'dist/a.ts': 'export const a = 1;',
    'lib/.gitignore': 'out/\n',
    'lib/out/c.ts': 'export const c = 1;',
    'lib/b.ts': 'export const b = 1;',
  });
  mkdirSync(join(root, '.git'));

  const measured = measureScope(root, '12 months ago', true);

  assert.match(
    renderHotspots(
      root,
      '12 months ago',
      measured,
      rankHotspots(measured.files, 30),
    ),
    new RegExp(
      `\\n${ignoredBy}the folders dist, lib/out, and the files they match\\.\\n`,
    ),
  );
});

test('one ignored folder is named as one folder', (context) => {
  const root = folderWith(context, {
    '.gitignore': 'gen/\n',
    'gen/a.ts': '',
    'b.ts': 'export const b = 1;',
  });
  mkdirSync(join(root, '.git'));

  const measured = measureScope(root, '12 months ago', false);

  assert.match(
    renderHotspots(
      root,
      '12 months ago',
      measured,
      rankHotspots(measured.files, 30),
    ),
    new RegExp(`\\n${ignoredBy}the folder gen, and the files they match\\.\\n`),
  );
});

test('a listing in a repository with no ignore file still says what it does not read', (context) => {
  const root = folderWith(context, { 'a.ts': 'export const a = 1;' });
  mkdirSync(join(root, '.git'));

  const measured = measureScope(root, '12 months ago', false);

  assert.match(
    renderHotspots(
      root,
      '12 months ago',
      measured,
      rankHotspots(measured.files, 30),
    ),
    new RegExp(`\\n${ignoredBy}the files they match\\.\\n`),
  );
});

test('a scope inside an ignored folder says so, since its table is empty', (context) => {
  const root = folderWith(context, {
    '.gitignore': 'vendor/\n',
    'vendor/x/a.ts': 'export const a = 1;',
  });
  mkdirSync(join(root, '.git'));
  const scope = join(root, 'vendor', 'x');

  const measured = measureScope(scope, '12 months ago', false);

  assert.match(
    renderHotspots(
      scope,
      '12 months ago',
      measured,
      rankHotspots(measured.files, 30),
    ),
    /\nLeft out, ignored: the whole scope, which lies in a folder the repository's ignore files ignore\.\n/,
  );
});

test('a full history is stated as such', (context) => {
  const root = repositoryWith(context, [{ 'a.ts': 'export const a = 1;' }]);

  const measured = measureScope(root, '12 months ago', true);

  assert.match(
    renderHotspots(
      root,
      '12 months ago',
      measured,
      rankHotspots(measured.files, 30),
    ),
    /\nHistory: the full history of the period\.\n/,
  );
});

test('a treeless clone shows no commit counts and says why', (context) => {
  const clone = partialCloneOf(
    context,
    repositoryWith(context, [
      { 'a.ts': 'export const a = 1;' },
      { 'a.ts': 'export const a = 2;' },
    ]),
    'tree:0',
  );

  const measured = measureScope(clone, '12 months ago', true);
  const report = renderHotspots(
    clone,
    '12 months ago',
    measured,
    rankHotspots(measured.files, 30),
  );

  assert.match(
    report,
    /\nHistory: a treeless clone, whose older commits name no files without fetching, so no commit counts, and no file counts as often changed\.\n/,
  );
  assert.match(report, /\n\| a\.ts \| - \|/);
});

test("a partial clone's history says renames are not followed", (context) => {
  const clone = partialCloneOf(
    context,
    repositoryWith(context, [{ 'a.ts': 'export const a = 1;' }]),
  );

  const measured = measureScope(clone, '12 months ago', true);

  assert.match(
    renderHotspots(
      clone,
      '12 months ago',
      measured,
      rankHotspots(measured.files, 30),
    ),
    /\nHistory: a partial clone, so renames are not followed and a renamed file's older commits count for its old path\.\n/,
  );
});
