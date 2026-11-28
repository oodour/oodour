import { readFileSync } from 'node:fs';
import { basename } from 'node:path';

export interface ChapterCitation {
  line: number;
  column: number;
  citation: string;
}

export function chapterCitations(text: string): ChapterCitation[] {
  return text.split('\n').flatMap((lineText, index) =>
    [...lineText.matchAll(/Ch\.\d+|\b[Cc]hapter \d+/g)].map((match) => ({
      line: index + 1,
      column: match.index + 1,
      citation: match[0],
    })),
  );
}

function matches(text: string, patterns: readonly RegExp[]): ChapterCitation[] {
  return text.split('\n').flatMap((lineText, index) =>
    patterns
      .flatMap((pattern) => [...lineText.matchAll(pattern)])
      .sort((left, right) => left.index - right.index)
      .map((match) => ({
        line: index + 1,
        column: match.index + 1,
        citation: match[0],
      })),
  );
}

// A one-word title such as "Rules" is a plain word in the plugin's prose, so only titles of two words or more count.
export function attributedTitles(text: string): string[] {
  return text
    .replace(/\n {2,}/g, ' ')
    .split('\n')
    .flatMap((line) => {
      const books = [...line.matchAll(/_([^_]+)_/g)].map(
        // Stryker disable next-line StringLiteral: the group always takes part in a match, so the default never applies
        ([, title = '']) => title.replace(/:.*/, ''),
      );

      if (books.length > 0) {
        return books;
      }

      const works = line.slice(line.indexOf(': ') + 2).split('; ');

      return works.flatMap(
        (work) => /(.+) \(\d{4}\)\.?$/.exec(work.trim())?.[1] ?? [],
      );
    })
    .map((title) => title.trim())
    .filter((title) => /\s/.test(title));
}

export function sourceMentions(
  text: string,
  titles: readonly string[],
): ChapterCitation[] {
  const standIns = /\b(?:she|hers?|the (?:book|talk|article))\b/gi;
  const named = titles.map(
    (title) =>
      new RegExp(
        `(?<![\\w])${title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?![\\w])`,
        'g',
      ),
  );

  return matches(text, [standIns, ...named]);
}

function citationsIn(
  file: string,
  titles: readonly string[] | undefined,
): ChapterCitation[] {
  const text = readFileSync(file, 'utf8');

  if (titles === undefined) {
    return chapterCitations(text);
  }

  return [...chapterCitations(text), ...sourceMentions(text, titles)].sort(
    (left, right) => left.line - right.line || left.column - right.column,
  );
}

// The distributed plugin names a practice and cites no source: no chapter number, title, stand-in such as "the book",
// or "her" for an author; ATTRIBUTION.md credits the works once (Lars, 2026-11-15 and 2026-11-19; AGENTS.md, "What
// you write").
export function main(
  files: readonly string[],
  print: (line: string) => void,
): number {
  const attribution = files.find((file) => basename(file) === 'ATTRIBUTION.md');
  const titles =
    attribution === undefined
      ? // Stryker disable next-line ArrayDeclaration: a seeded title differs only for a file that quotes the seeded text itself
        []
      : attributedTitles(readFileSync(attribution, 'utf8'));
  let count = 0;

  for (const file of files) {
    for (const { line, column, citation } of citationsIn(
      file,
      file === attribution ? undefined : titles,
    )) {
      print(`${file}:${String(line)}:${String(column)}: ${citation}`);
      count++;
    }
  }

  if (count > 0) {
    print(
      `[ERROR] ${String(count)} citation(s); name the practice instead and credit the work in ATTRIBUTION.md`,
    );

    return 1;
  }

  print('[OK] no citations');

  return 0;
}

if (import.meta.main) {
  // Stryker disable next-line MethodExpression: argv[0] and argv[1] are the node binary and this script, and neither holds a chapter citation, so the output is the same
  process.exitCode = main(process.argv.slice(2), (line) => {
    console.log(line);
  });
}
