// Checks that each store entry's index and files agree: every path an index names exists and is
// not empty, and every Markdown file at the top of an entry has an index row. It prints counts,
// and names only for collections, whose file names are work titles. A book's file names carry its
// chapter headings, so for a book it prints counts alone. Of the missing cells it names only those
// that end in `.md` or `/`. It never prints file content.
//
// Usage: node tools/store-check.ts        Exit 0 = consistent. Exit 1 = a problem. Exit 2 = no store.

import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { basename, join } from 'node:path';
import { storeDir, titledEntries } from './source-overlap.ts';

const namedEntries: ReadonlySet<string> = new Set([...titledEntries, '99bottles-js']);

export interface EntryReport {
  readonly entry: string;
  readonly indexed: number;
  readonly missing: readonly string[];
  readonly empty: readonly string[];
  readonly unindexed: readonly string[];
}

function decoded(target: string): string {
  try {
    return decodeURIComponent(target);
  } catch {
    return target;
  }
}

// What an index names: relative link targets on any line, and on table rows the backticked cells
// that hold a path (`name.md`, `repo/lib`, not `kind_of?`) and the bare cells that are a file or a
// folder (name.md, github/repo/).
export function indexedPaths(index: string): readonly string[] {
  return index.split('\n').flatMap((line) => {
    const links = [...line.matchAll(/\]\(([^)\s]+)\)/g)]
      .flatMap((match) => match.slice(1, 2))
      .map((target) => decoded(target.replace(/#.*/, '')))
      .filter((target) => target !== '' && !/^[a-z]+:/i.test(target));

    if (!line.startsWith('|')) {
      return links;
    }

    const ticked = [...line.matchAll(/`([^`]+)`/g)]
      .flatMap((match) => match.slice(1, 2))
      .filter((cell) => /[./]/.test(cell) && !/\s/.test(cell) && !cell.startsWith('http'));
    const bare = line
      .split('|')
      .map((cell) => cell.trim())
      .filter((cell) => /^[^`\s()[\]]+(\.md|\/)$/.test(cell) && !cell.startsWith('http'));

    return [...links, ...ticked, ...bare];
  });
}

function size(path: string): number {
  const stat = statSync(path);

  return stat.isDirectory() ? readdirSync(path).length : stat.size;
}

// A cell resolves against the entry folder, or against a folder at its top (a clone's `repo/`).
function resolveCell(entryDir: string, cell: string): string | undefined {
  const roots = [entryDir, ...readdirSync(entryDir, { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => join(entryDir, d.name))];

  return roots.map((root) => join(root, cell)).find((path) => existsSync(path));
}

export function checkEntry(dir: string, entry: string): EntryReport | undefined {
  const entryDir = join(dir, entry);
  const indexPath = join(entryDir, 'index.md');

  if (!existsSync(indexPath)) {
    return undefined;
  }

  const cells = [...new Set(indexedPaths(readFileSync(indexPath, 'utf8')))];
  const resolved = cells.map((cell) => ({ cell, path: resolveCell(entryDir, cell) }));
  const named = new Set(cells.map((cell) => basename(cell)));
  const topFiles = readdirSync(entryDir).filter((name) => name.endsWith('.md') && name !== 'index.md');

  return {
    entry,
    indexed: cells.length,
    missing: resolved.flatMap(({ cell, path }) => (path === undefined ? [cell] : [])),
    empty: resolved.flatMap(({ cell, path }) => (path !== undefined && size(path) === 0 ? [cell] : [])),
    unindexed: topFiles.filter((name) => !named.has(name)),
  };
}

export function describe(report: EntryReport): readonly string[] {
  const problems = report.missing.length + report.empty.length + report.unindexed.length;
  const head = `${report.entry}: ${String(report.indexed)} indexed, ${String(report.missing.length)} missing, ${String(report.empty.length)} empty, ${String(report.unindexed.length)} unindexed`;

  if (problems === 0 || !namedEntries.has(report.entry)) {
    return [problems === 0 ? `[OK] ${head}` : `[ERROR] ${head}`];
  }

  return [
    `[ERROR] ${head}`,
    // Any other cell could be a code token from a work.
    ...report.missing.filter((name) => /(?:\.md|\/)$/.test(name)).map((name) => `  missing: ${name}`),
    ...report.empty.map((name) => `  empty: ${name}`),
    ...report.unindexed.map((name) => `  unindexed: ${name}`),
  ];
}

export function main(dir: string = storeDir): number {
  if (!existsSync(dir)) {
    console.error('[ERROR] no store at .oracle/');

    return 2;
  }

  // Stryker disable next-line MethodExpression: a file at the store root has no index.md below it, so checkEntry skips it anyway
  const reports = readdirSync(dir, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .flatMap((d) => checkEntry(dir, d.name) ?? []);

  for (const line of reports.flatMap(describe)) {
    console.log(line);
  }

  return reports.every((r) => r.missing.length + r.empty.length + r.unindexed.length === 0) ? 0 : 1;
}

if (process.argv[1] !== undefined && basename(process.argv[1]) === 'store-check.ts') {
  process.exitCode = main();
}
