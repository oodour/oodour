#!/usr/bin/env node
// Reports verbatim word runs shared between a text and the sealed store in `.oracle/`.
// It never prints matched text: only a location, a run length and the store entry. That is
// what makes it safe for any agent to run against the sealed store. Keep it that way.
//
// Usage:
//   node tools/source-overlap.mjs <file> [more files]
//   node tools/source-overlap.mjs --min-words 6 <file>
//
// Exit 0 = no run at or above the threshold. Exit 1 = overlap found. Exit 2 = bad usage.

import { readdirSync, readFileSync } from 'node:fs';
import { basename, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

export const storeDir = resolve(fileURLToPath(new URL('../.oracle', import.meta.url)));
export const draftMinWords = 8;
// Ordinary technical English collides by chance at four or five words (measured in
// angular-clean-architecture, 2026-08-16), so six is the floor for an agent's hand-back.
export const handBackMinWords = 6;

// Names are allowed; expression is not. A run made only of a work's title, or of the
// public-domain song the 99 Bottles exercise is built on, is not a finding.
export const permittedPhrases = [
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

const breakToken = '\u0000';

function normalize(text) {
  return text.toLowerCase().replace(/[‘’]/g, "'");
}

export function tokenize(text) {
  return normalize(text).match(/[a-z0-9']+|\u0000/g) ?? [];
}

function maskPermitted(text, phrases) {
  let masked = normalize(text);

  for (const phrase of phrases) {
    const words = tokenize(phrase).map((word) => word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
    masked = masked.replace(new RegExp(`\\b${words.join("[^a-z0-9']+")}\\b`, 'g'), ` ${breakToken} `);
  }

  return masked;
}

function listMarkdown(dir) {
  const files = [];

  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);

    if (entry.isDirectory()) {
      files.push(...listMarkdown(path));
    } else if (entry.name.endsWith('.md')) {
      files.push(path);
    }
  }

  return files;
}

const isIndex = (file) => ['index.md', 'README.md'].includes(basename(file));

// A work's title is a name, so every talk or article title an index lists is permitted: the first
// cell of each table row, without its parenthesised venue. A book's chapter headings are expression,
// so the book's index is not read for this.
const collections = new Set(['metz-talks', 'metz-written']);

function indexTitles(files, dir) {
  const listed = files.filter((file) => isIndex(file) && collections.has(relative(dir, file).split(sep)[0]));

  return listed.flatMap((file) =>
    readFileSync(file, 'utf8')
      .split('\n')
      .map((line) => line.match(/^\|\s*([^|]+?)\s*\|/)?.[1] ?? '')
      .filter((cell) => cell && !/^-+$|^(title|talk|book|entry)$/i.test(cell))
      .flatMap((cell) => [cell, cell.replace(/\s*\([^)]*\)\s*$/, '')]),
  );
}

export function loadCorpus(minWords, dir = storeDir) {
  const grams = new Map();
  const files = listMarkdown(dir);

  for (const file of files.filter((path) => !isIndex(path))) {
    const entry = relative(dir, file).split(sep)[0];
    const tokens = tokenize(readFileSync(file, 'utf8'));

    for (let i = 0; i + minWords <= tokens.length; i++) {
      const gram = tokens.slice(i, i + minWords).join(' ');

      if (!grams.has(gram)) {
        grams.set(gram, entry);
      }
    }
  }

  return { minWords, grams, phrases: [...permittedPhrases, ...indexTitles(files, dir)] };
}

// Returns runs as { start, words, entry }: word offsets into the text, never the words.
export function findRuns(text, corpus) {
  const { minWords, grams, phrases } = corpus;
  const tokens = tokenize(maskPermitted(text, phrases));
  const runs = [];
  let current;

  for (let i = 0; i + minWords <= tokens.length; i++) {
    const window = tokens.slice(i, i + minWords);
    const entry = window.includes(breakToken) ? undefined : grams.get(window.join(' '));

    if (entry === undefined) {
      current = undefined;
      continue;
    }

    if (current && current.start + current.words - minWords === i) {
      current.words++;
    } else {
      current = { start: i + 1, words: minWords, entry };
      runs.push(current);
    }
  }

  return runs;
}

export function describeRuns(runs) {
  return runs.map((run) => `words ${run.start}-${run.start + run.words - 1} (${run.words} words, entry ${run.entry})`);
}

function main(args) {
  let minWords = draftMinWords;
  const files = [];

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--min-words') {
      minWords = Number(args[++i]);
    } else {
      files.push(args[i]);
    }
  }

  if (files.length === 0 || !Number.isInteger(minWords) || minWords < 4) {
    console.error('usage: node tools/source-overlap.mjs [--min-words N>=4] <file> [more files]');

    return 2;
  }

  const corpus = loadCorpus(minWords);
  let found = 0;

  for (const file of files) {
    for (const line of describeRuns(findRuns(readFileSync(file, 'utf8'), corpus))) {
      console.log(`${file}: ${line}`);
      found++;
    }
  }

  console.log(found === 0 ? `[OK] no run of ${minWords}+ words shared with the store` : `[ERROR] ${found} run(s)`);

  return found === 0 ? 0 : 1;
}

if (process.argv[1] && basename(process.argv[1]) === 'source-overlap.mjs') {
  process.exitCode = main(process.argv.slice(2));
}
