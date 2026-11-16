// Reports verbatim word runs shared between a text and the sealed store in `.oracle/`, or with `--corpus`, an open
// source kept outside the store (such as a clone of the TypeScript Handbook).
// It never prints matched text: only a location, a run length and the store entry. That is
// what makes it safe for any agent to run against the sealed store. Keep it that way.
//
// Usage:
//   node tools/source-overlap.ts <file> [more files]
//   node tools/source-overlap.ts --min-words 6 <file>
//   node tools/source-overlap.ts --corpus <folder> <file>
//
// Exit 0 = no run at or above the threshold. Exit 1 = overlap found. Exit 2 = bad usage or a file
// that cannot be read (the other files are still checked and their runs printed).

import { readdirSync, readFileSync } from 'node:fs';
import { basename, extname, join, relative, resolve, sep } from 'node:path';

// Not exported: an imported store path would let a script reach the store without naming it.
const storeDir = resolve(import.meta.dirname, '..', '.oracle');
export const draftMinWords = 8;
// Ordinary technical English collides by chance at four or five words (measured in
// angular-clean-architecture, 2026-08-16), so six is the floor for an agent's hand-back, and for every
// caller: below it, hit positions let a caller test candidate wording against the source.
export const handBackMinWords = 6;

// Names are allowed; expression is not. A run made only of a work's title, or of the
// public-domain song the 99 Bottles exercise is built on, is not a finding.
export const permittedPhrases: readonly string[] = [
  '99 Bottles of OOP',
  'JavaScript Edition',
  'Practical Object-Oriented Design',
  'An Agile Primer Using Ruby',
  'Sandi Metz',
  'Katrina Owen',
  'TJ Stankus',
  'Refactoring: Improving the Design of Existing Code',
  'Refactoring to Patterns',
  'xUnit Test Patterns: Refactoring Test Code',
  'Design Patterns: Elements of Reusable Object-Oriented Software',
  'Working Effectively with Legacy Code',
  'Martin Fowler',
  'Michael Feathers',
  'Joshua Kerievsky',
  'Gerard Meszaros',
  'Object Design: Roles, Responsibilities, and Collaborations',
  'Rebecca Wirfs-Brock',
  'Alan McKean',
  'Kent Beck',
  'bottles of beer on the wall',
  'take one down and pass it around',
  'take it down and pass it around',
  'go to the store and buy some more',
  'no more bottles of beer',
];

// A work's title is a name, so the talk and article titles their indexes list are permitted.
// A book's chapter headings are expression, so the book's index is not read for this.
export const titledEntries: ReadonlySet<string> = new Set([
  'metz-talks',
  'metz-written',
  'owen-talks',
  'metz-cited-articles',
  'beck-writing',
]);

export interface Run {
  readonly start: number;
  readonly words: number;
  readonly entry: string;
}

export interface Corpus {
  readonly minWords: number;
}

interface Contents {
  readonly grams: ReadonlyMap<string, string>;
  readonly phrases: readonly string[];
}

// The words stay inside this module, so a script that imports it learns run positions and never the text.
const contents = new WeakMap<Corpus, Contents>();

function normalize(text: string): string {
  return text.normalize('NFKC').toLowerCase().replace(/[‘’]/g, "'");
}

export function tokenize(text: string): readonly string[] {
  return normalize(text).match(/[a-z0-9]+(?:'[a-z0-9]+)*/g) ?? [];
}

// The prose and the example code a work holds.
const textExtensions: ReadonlySet<string> = new Set(['.md', '.txt', '.js', '.mjs', '.cjs', '.ts', '.jsx', '.tsx', '.rb']);
// A clone's history and its installed dependencies are not the work.
const skippedFolders: ReadonlySet<string> = new Set(['.git', 'node_modules']);

function listTextFiles(dir: string): readonly string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);

    if (entry.isDirectory()) {
      return skippedFolders.has(entry.name) ? [] : listTextFiles(path);
    }

    return entry.isFile() && textExtensions.has(extname(entry.name).toLowerCase()) ? [path] : [];
  });
}

function entryOf(dir: string, file: string): string {
  // Stryker disable next-line StringLiteral: split always returns a first element, so the fallback never runs
  return relative(dir, file).split(sep)[0] ?? '';
}

// The store's listing and each entry's own index describe the works; files of those names deeper in an entry are works.
function isIndex(dir: string, file: string): boolean {
  const parts = relative(dir, file).split(sep);

  return (parts.length === 1 && parts[0] === 'README.md') || (parts.length === 2 && parts[1] === 'index.md');
}

function isSeparator(line: string): boolean {
  return /^\|(?:\s*:?-+:?\s*\|)+\s*$/.test(line);
}

function cellsOf(row: string): readonly string[] {
  return row
    .replace(/^\||\|$/g, '')
    .split('|')
    .map((cell) => cell.trim());
}

// The title cell of each body row: the column a header names Title or Talk, else the first.
// A header row (the row above a separator) is never a title.
function titleCells(index: string): readonly string[] {
  const lines = index.split('\n').map((line) => line.trim());
  // Stryker disable next-line ArrayDeclaration: a seeded title differs only for a draft that quotes the seeded text itself
  const titles: string[] = [];
  let column = 0;

  lines.forEach((line, i) => {
    if (!line.startsWith('|') || isSeparator(line)) {
      return;
    }

    const cells = cellsOf(line);

    // Stryker disable next-line StringLiteral: the fallback after the last line is no separator, whatever its text
    if (isSeparator(lines[i + 1] ?? '')) {
      column = Math.max(0, cells.findIndex((cell) => /^(title|talk)$/i.test(cell)));

      return;
    }

    // Stryker disable next-line StringLiteral: a short row's fallback differs only for a draft that quotes the replacement text itself
    titles.push(cells[column] ?? '');
  });

  return titles;
}

// A one-word or numeric cell would mask a common word or number everywhere in a report.
function isTitle(cell: string): boolean {
  const words = tokenize(cell);

  return words.length >= 2 && words.some((word) => /[a-z]/.test(word));
}

function indexTitles(dir: string, files: readonly string[]): readonly string[] {
  return files
    .filter((file) => isIndex(dir, file) && titledEntries.has(entryOf(dir, file)))
    .flatMap((file) => titleCells(readFileSync(file, 'utf8')))
    .flatMap((cell) => [cell, cell.replace(/\s*\([^)]*\)\s*$/, '')])
    .filter(isTitle);
}

export function loadCorpus(minWords: number, dir: string = storeDir): Corpus {
  if (!(Number.isInteger(minWords) && minWords >= handBackMinWords)) {
    throw new Error(`source-overlap: a run must be at least ${String(handBackMinWords)} words, got ${String(minWords)}`);
  }

  const grams = new Map<string, string>();
  const files = listTextFiles(dir);

  for (const file of files.filter((path) => !isIndex(dir, path))) {
    const entry = entryOf(dir, file);
    const text = readFileSync(file, 'utf8');
    // A NUL byte marks a binary file whatever its extension.
    // Stryker disable next-line ArrayDeclaration: one token is below the six-word floor, so it adds no gram
    const tokens = text.includes('\u0000') ? [] : tokenize(text);

    // Stryker disable next-line ArithmeticOperator: a gram past the end has fewer words than every window findRuns looks up, so it matches none
    for (let i = 0; i + minWords <= tokens.length; i++) {
      const gram = tokens.slice(i, i + minWords).join(' ');

      if (!grams.has(gram)) {
        grams.set(gram, entry);
      }
    }
  }

  const corpus: Corpus = { minWords };
  contents.set(corpus, { grams, phrases: [...permittedPhrases, ...indexTitles(dir, files)] });

  return corpus;
}

// The positions of the tokens that belong to a permitted phrase.
function maskedPositions(tokens: readonly string[], phrases: readonly string[]): ReadonlySet<number> {
  const masked = new Set<number>();

  for (const words of phrases.map(tokenize)) {
    // Stryker disable next-line ArithmeticOperator: positions past the end read undefined, which matches no word
    for (let i = 0; i + words.length <= tokens.length; i++) {
      if (words.every((word, k) => tokens[i + k] === word)) {
        words.forEach((_, k) => masked.add(i + k));
      }
    }
  }

  return masked;
}

// Runs are word offsets into the text (1-based), never the words.
export function findRuns(text: string, corpus: Corpus): readonly Run[] {
  const loaded = contents.get(corpus);

  if (loaded === undefined) {
    throw new Error('source-overlap: not a corpus that loadCorpus returned');
  }

  const tokens = tokenize(text);
  const masked = maskedPositions(tokens, loaded.phrases);
  const runs: { start: number; words: number; entry: string }[] = [];
  let current: { start: number; words: number; entry: string } | undefined;

  // Stryker disable next-line ArithmeticOperator: a window past the end has fewer words than any gram, so it matches none
  for (let i = 0; i + corpus.minWords <= tokens.length; i++) {
    const window = tokens.slice(i, i + corpus.minWords);
    const entry = window.some((_, k) => masked.has(i + k)) ? undefined : loaded.grams.get(window.join(' '));

    if (entry === undefined) {
      current = undefined;
      continue;
    }

    // A miss resets current, so a run still open here ends at the window before this one.
    if (current !== undefined) {
      current.words++;
    } else {
      current = { start: i + 1, words: corpus.minWords, entry };
      runs.push(current);
    }
  }

  return runs;
}

export function describeRuns(runs: readonly Run[]): readonly string[] {
  return runs.map(
    (run) => `words ${String(run.start)}-${String(run.start + run.words - 1)} (${String(run.words)} words, entry ${run.entry})`,
  );
}

interface Options {
  readonly minWords: number;
  readonly files: readonly string[];
  readonly corpus?: string;
}

export function parseArgs(args: readonly string[]): Options | undefined {
  let minWords = draftMinWords;
  let corpus: string | undefined;
  const files: string[] = [];
  const rest = [...args];

  for (let arg = rest.shift(); arg !== undefined; arg = rest.shift()) {
    if (arg === '--min-words') {
      minWords = Number(rest.shift());
    } else if (arg === '--corpus') {
      corpus = rest.shift();
    } else {
      files.push(arg);
    }
  }

  if (files.length === 0 || !Number.isInteger(minWords) || minWords < handBackMinWords) {
    return undefined;
  }

  return corpus === undefined ? { minWords, files } : { minWords, files, corpus };
}

// Undefined, with the reason on stderr, when the file cannot be read.
function readDraft(file: string): string | undefined {
  try {
    return readFileSync(file, 'utf8');
  } catch (error) {
    console.error(`[ERROR] ${file}: cannot read it (${error instanceof Error ? error.message : String(error)})`);

    return undefined;
  }
}

export function main(args: readonly string[], dir: string = storeDir): number {
  const options = parseArgs(args);

  if (options === undefined) {
    console.error('usage: node tools/source-overlap.ts [--min-words N>=6] [--corpus <folder>] <file> [more files]');

    return 2;
  }

  const corpus = loadCorpus(options.minWords, options.corpus ?? dir);
  let found = 0;
  let unreadable = 0;

  for (const file of options.files) {
    const text = readDraft(file);

    if (text === undefined) {
      unreadable++;
      continue;
    }

    for (const line of describeRuns(findRuns(text, corpus))) {
      console.log(`${file}: ${line}`);
      found++;
    }
  }

  if (unreadable > 0) {
    return 2;
  }

  console.log(
    found === 0
      ? `[OK] no run of ${String(options.minWords)}+ words shared with ${options.corpus ?? 'the store'}`
      : `[ERROR] ${String(found)} run(s)`,
  );

  return found === 0 ? 0 : 1;
}

if (process.argv[1] !== undefined && basename(process.argv[1]) === 'source-overlap.ts') {
  process.exitCode = main(process.argv.slice(2));
}
