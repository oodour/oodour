// Reports verbatim word runs shared between a text and the sealed store in `.oracle/`.
// It never prints matched text: only a location, a run length and the store entry. That is
// what makes it safe for any agent to run against the sealed store. Keep it that way.
//
// Usage:
//   node tools/source-overlap.ts <file> [more files]
//   node tools/source-overlap.ts --min-words 6 <file>
//
// Exit 0 = no run at or above the threshold. Exit 1 = overlap found. Exit 2 = bad usage.

import { readdirSync, readFileSync } from 'node:fs';
import { basename, join, relative, resolve, sep } from 'node:path';

export const storeDir = resolve(import.meta.dirname, '..', '.oracle');
export const draftMinWords = 8;
// Ordinary technical English collides by chance at four or five words (measured in
// angular-clean-architecture, 2026-08-16), so six is the floor for an agent's hand-back.
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
  'bottles of beer on the wall',
  'take one down and pass it around',
  'take it down and pass it around',
  'go to the store and buy some more',
  'no more bottles of beer',
];

// A work's title is a name, so the talk and article titles their indexes list are permitted.
// A book's chapter headings are expression, so the book's index is not read for this.
export const titledEntries: ReadonlySet<string> = new Set(['metz-talks', 'metz-written', 'owen-talks']);
const indexNames: ReadonlySet<string> = new Set(['index.md', 'README.md']);

export interface Run {
  readonly start: number;
  readonly words: number;
  readonly entry: string;
}

export interface Corpus {
  readonly minWords: number;
  readonly grams: ReadonlyMap<string, string>;
  readonly phrases: readonly string[];
}

function normalize(text: string): string {
  return text.normalize('NFKC').toLowerCase().replace(/[‘’]/g, "'");
}

export function tokenize(text: string): readonly string[] {
  return normalize(text).match(/[a-z0-9]+(?:'[a-z0-9]+)*/g) ?? [];
}

function listMarkdown(dir: string): readonly string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);

    if (entry.isDirectory()) {
      return listMarkdown(path);
    }

    return entry.isFile() && entry.name.endsWith('.md') ? [path] : [];
  });
}

function entryOf(dir: string, file: string): string {
  return relative(dir, file).split(sep)[0] ?? '';
}

function firstCell(line: string): string {
  return /^\|\s*([^|]+?)\s*\|/.exec(line)?.[1] ?? '';
}

function indexTitles(dir: string, files: readonly string[]): readonly string[] {
  return files
    .filter((file) => indexNames.has(basename(file)) && titledEntries.has(entryOf(dir, file)))
    .flatMap((file) => readFileSync(file, 'utf8').split('\n').map(firstCell))
    .filter((cell) => cell !== '' && !/^-+$|^(title|talk|book|entry)$/i.test(cell))
    .flatMap((cell) => [cell, cell.replace(/\s*\([^)]*\)\s*$/, '')]);
}

export function loadCorpus(minWords: number, dir: string = storeDir): Corpus {
  const grams = new Map<string, string>();
  const files = listMarkdown(dir);

  for (const file of files.filter((path) => !indexNames.has(basename(path)))) {
    const entry = entryOf(dir, file);
    const tokens = tokenize(readFileSync(file, 'utf8'));

    for (let i = 0; i + minWords <= tokens.length; i++) {
      const gram = tokens.slice(i, i + minWords).join(' ');

      if (!grams.has(gram)) {
        grams.set(gram, entry);
      }
    }
  }

  return { minWords, grams, phrases: [...permittedPhrases, ...indexTitles(dir, files)] };
}

// The positions of the tokens that belong to a permitted phrase.
function maskedPositions(tokens: readonly string[], phrases: readonly string[]): ReadonlySet<number> {
  const masked = new Set<number>();

  for (const words of phrases.map(tokenize).filter((words) => words.length > 0)) {
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
  const tokens = tokenize(text);
  const masked = maskedPositions(tokens, corpus.phrases);
  const runs: { start: number; words: number; entry: string }[] = [];
  let current: { start: number; words: number; entry: string } | undefined;

  for (let i = 0; i + corpus.minWords <= tokens.length; i++) {
    const window = tokens.slice(i, i + corpus.minWords);
    const entry = window.some((_, k) => masked.has(i + k)) ? undefined : corpus.grams.get(window.join(' '));

    if (entry === undefined) {
      current = undefined;
      continue;
    }

    if (current !== undefined && current.start + current.words - corpus.minWords === i) {
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
}

export function parseArgs(args: readonly string[]): Options | undefined {
  let minWords = draftMinWords;
  const files: string[] = [];

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg === '--min-words') {
      minWords = Number(args[++i]);
    } else if (arg !== undefined) {
      files.push(arg);
    }
  }

  return files.length > 0 && Number.isInteger(minWords) && minWords >= 4 ? { minWords, files } : undefined;
}

export function main(args: readonly string[], dir: string = storeDir): number {
  const options = parseArgs(args);

  if (options === undefined) {
    console.error('usage: node tools/source-overlap.ts [--min-words N>=4] <file> [more files]');

    return 2;
  }

  const corpus = loadCorpus(options.minWords, dir);
  let found = 0;

  for (const file of options.files) {
    for (const line of describeRuns(findRuns(readFileSync(file, 'utf8'), corpus))) {
      console.log(`${file}: ${line}`);
      found++;
    }
  }

  console.log(
    found === 0
      ? `[OK] no run of ${String(options.minWords)}+ words shared with the store`
      : `[ERROR] ${String(found)} run(s)`,
  );

  return found === 0 ? 0 : 1;
}

if (process.argv[1] !== undefined && basename(process.argv[1]) === 'source-overlap.ts') {
  process.exitCode = main(process.argv.slice(2));
}
