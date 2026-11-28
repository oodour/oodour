import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tempDir } from './temp-dir.ts';
import { pathToFileURL } from 'node:url';
import { test } from 'node:test';
import {
  attributedTitles,
  chapterCitations,
  main,
  sourceMentions,
} from './citations.ts';

function files(contents: Record<string, string>): string[] {
  const dir = tempDir('citations-');

  return Object.entries(contents).map(([name, text]) => {
    const path = join(dir, name);
    writeFileSync(path, text);

    return path;
  });
}

test('a chapter number is reported with its line and column', () => {
  assert.deepEqual(
    chapterCitations('Shameless Green.\nStart plain (Ch.1 and Ch.2).'),
    [
      { line: 2, column: 14, citation: 'Ch.1' },
      { line: 2, column: 23, citation: 'Ch.2' },
    ],
  );
});

test('a pronoun standing for an author is reported, in any case, as a whole word only', () => {
  assert.deepEqual(
    sourceMentions(
      'She waits for the third.\nAs her talk says; there, shelf and hero stay.',
      [],
    ),
    [
      { line: 1, column: 1, citation: 'She' },
      { line: 2, column: 4, citation: 'her' },
    ],
  );
});

test('a stand-in for a source is reported, and so is hers', () => {
  assert.deepEqual(
    sourceMentions(
      'As The book says, and the talk, and the article: the idea is hers.',
      [],
    ),
    [
      { line: 1, column: 4, citation: 'The book' },
      { line: 1, column: 23, citation: 'the talk' },
      { line: 1, column: 37, citation: 'the article' },
      { line: 1, column: 62, citation: 'hers' },
    ],
  );
});

test('a title from the list is reported as written, and a lower-case phrase is not', () => {
  assert.deepEqual(
    sourceMentions(
      'Wait (Nothing is Something). A nothing is something object.',
      ['Nothing is Something'],
    ),
    [{ line: 1, column: 7, citation: 'Nothing is Something' }],
  );
});

test('a title that ends in punctuation is reported', () => {
  assert.deepEqual(
    sourceMentions('See What Does OO Afford? for more.', [
      'What Does OO Afford?',
    ]),
    [{ line: 1, column: 5, citation: 'What Does OO Afford?' }],
  );
});

test('titles come from the attribution list: book titles before a subtitle, dated talk and article titles', () => {
  const attribution = [
    '- Jo Ash, _Plain Objects: A Primer_ (2018).',
    '- Kim Bay, _Tested Code_, 2nd edition.',
    '- Jo Ash: Less, the Path to Design (2011); Rules (2013); What Does OO Afford? (2018); and further talks.',
  ].join('\n');

  assert.deepEqual(attributedTitles(attribution), [
    'Plain Objects',
    'Tested Code',
    'Less, the Path to Design',
    'What Does OO Afford?',
  ]);
});

test('titles and stand-ins on one line are reported in the order they appear', () => {
  assert.deepEqual(
    sourceMentions('Read Plain Old Objects, as she says, then Tested Code.', [
      'Plain Old Objects',
      'Tested Code',
    ]),
    [
      { line: 1, column: 6, citation: 'Plain Old Objects' },
      { line: 1, column: 28, citation: 'she' },
      { line: 1, column: 43, citation: 'Tested Code' },
    ],
  );
});

test('a dated title is taken only when the date ends its entry, and with no author it is taken whole', () => {
  const attribution = [
    '- Jo Ash: Plain Old Objects (2014) revised; Tested Code (2015)',
    '- Quiet Small Things (2016).',
  ].join('\n');

  assert.deepEqual(attributedTitles(attribution), [
    'Tested Code',
    'Quiet Small Things',
  ]);
});

test('a title is taken without the spaces around it', () => {
  const attribution = [
    '- Jo Ash, _Plain Objects : A Primer_ (2018).',
    '- Jo Ash: Tested  Code  (2015).  ',
  ].join('\n');

  assert.deepEqual(attributedTitles(attribution), [
    'Plain Objects',
    'Tested  Code',
  ]);
});

test('a list item wrapped over several lines keeps its titles whole', () => {
  const attribution =
    '- Jo Ash: Go Ahead, Make a\n  Mess (2012); Why We Argue:\n  Style (2017).';

  assert.deepEqual(attributedTitles(attribution), [
    'Go Ahead, Make a Mess',
    'Why We Argue: Style',
  ]);
});

test('a chapter number of two digits is reported whole', () => {
  assert.deepEqual(chapterCitations('See Ch.12.'), [
    { line: 1, column: 5, citation: 'Ch.12' },
  ]);
});

test('run as a script, it checks the files named on the command line and sets the exit code', () => {
  const [cited] = files({ 'cited.md': 'Two (Ch.3).' });
  assert.ok(cited);
  const run = spawnSync(
    process.execPath,
    [join(import.meta.dirname, 'citations.ts'), cited],
    {
      encoding: 'utf8',
    },
  );

  assert.equal(run.status, 1);
  assert.equal(
    run.stdout,
    `${cited}:1:6: Ch.3\n[ERROR] 1 citation(s); name the practice instead and credit the work in ATTRIBUTION.md\n`,
  );
});

test('imported as a module, it checks nothing and leaves the exit code alone', () => {
  const [cited] = files({ 'cited.md': 'Two (Ch.3).' });
  assert.ok(cited);
  const script = pathToFileURL(join(import.meta.dirname, 'citations.ts')).href;
  const run = spawnSync(
    process.execPath,
    ['--input-type=module', '-e', `await import('${script}');`, cited, cited],
    {
      encoding: 'utf8',
    },
  );

  assert.equal(run.status, 0);
  assert.equal(run.stdout, '');
});

test('a chapter number written out is reported too, and a chapter without a number is not', () => {
  assert.deepEqual(
    chapterCitations(
      'As chapter 8 shows; Chapter 10 too; each chapter teaches one thing.',
    ),
    [
      { line: 1, column: 4, citation: 'chapter 8' },
      { line: 1, column: 21, citation: 'Chapter 10' },
    ],
  );
});

test('the command lists each citation by file, line and column, and fails', () => {
  const [clean, cited] = files({
    'clean.md': 'No numbers here.',
    'cited.md': 'One.\nTwo (Ch.3).',
  });
  const lines: string[] = [];
  assert.ok(clean);
  assert.ok(cited);

  assert.equal(
    main([clean, cited], (line) => lines.push(line)),
    1,
  );
  assert.deepEqual(lines, [
    `${cited}:2:6: Ch.3`,
    '[ERROR] 1 citation(s); name the practice instead and credit the work in ATTRIBUTION.md',
  ]);
});

test('the command reports titles named in ATTRIBUTION.md and stand-ins in every other file', () => {
  const dir = tempDir('citations-');
  const attribution = join(dir, 'ATTRIBUTION.md');
  const skill = join(dir, 'SKILL.md');
  writeFileSync(
    attribution,
    '- Jo Ash: Plain Old Objects (2014); her talks.\n',
  );
  writeFileSync(skill, 'Start plain (Plain Old Objects).\nAs she says.\n');
  const lines: string[] = [];

  assert.equal(
    main([attribution, skill], (line) => lines.push(line)),
    1,
  );
  assert.deepEqual(lines, [
    `${skill}:1:14: Plain Old Objects`,
    `${skill}:2:4: she`,
    '[ERROR] 2 citation(s); name the practice instead and credit the work in ATTRIBUTION.md',
  ]);
});

test('the command lists the chapter numbers and stand-ins of a file together, by line and then column', () => {
  const [skill] = files({ 'SKILL.md': 'As she says (Ch.3).\nSee Ch.4.\n' });
  const lines: string[] = [];
  assert.ok(skill);

  assert.equal(
    main([skill], (line) => lines.push(line)),
    1,
  );
  assert.deepEqual(lines, [
    `${skill}:1:4: she`,
    `${skill}:1:14: Ch.3`,
    `${skill}:2:5: Ch.4`,
    '[ERROR] 3 citation(s); name the practice instead and credit the work in ATTRIBUTION.md',
  ]);
});

test('ATTRIBUTION.md is found wherever it stands among the files', () => {
  const [skill, attribution] = files({
    'SKILL.md': 'Start plain (Plain Old Objects).\n',
    'ATTRIBUTION.md': '- Jo Ash: Plain Old Objects (2014).\n',
  });
  const lines: string[] = [];
  assert.ok(skill && attribution);

  assert.equal(
    main([skill, attribution], (line) => lines.push(line)),
    1,
  );
  assert.deepEqual(lines, [
    `${skill}:1:14: Plain Old Objects`,
    '[ERROR] 1 citation(s); name the practice instead and credit the work in ATTRIBUTION.md',
  ]);
});

test('the command passes when no file cites a chapter', () => {
  const lines: string[] = [];

  assert.equal(
    main(
      files({ 'clean.md': 'Shameless Green, from 99 Bottles of OOP.' }),
      (line) => lines.push(line),
    ),
    0,
  );
  assert.deepEqual(lines, ['[OK] no citations']);
});
