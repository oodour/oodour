import { readFileSync } from 'node:fs';

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

// The distributed plugin names a practice instead of citing a chapter: a reader without the book gains nothing from
// the number (Lars, 2026-11-15; AGENTS.md, "What you write").
export function main(files: readonly string[], print: (line: string) => void): number {
  let count = 0;

  for (const file of files) {
    for (const { line, column, citation } of chapterCitations(readFileSync(file, 'utf8'))) {
      print(`${file}:${String(line)}:${String(column)}: ${citation}`);
      count++;
    }
  }

  if (count > 0) {
    print(`[ERROR] ${String(count)} chapter citation(s); name the practice instead`);

    return 1;
  }

  print('[OK] no chapter citations');

  return 0;
}

if (import.meta.main) {
  // Stryker disable next-line MethodExpression: argv[0] and argv[1] are the node binary and this script, and neither holds a chapter citation, so the output is the same
  process.exitCode = main(process.argv.slice(2), (line) => {
    console.log(line);
  });
}
