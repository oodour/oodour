import { posix, relative, sep } from 'node:path';

/** The path from the working directory, with `/` between its parts on every platform so a line reads the same. */
export function shownPath(path: string): string {
  return relative(process.cwd(), path).split(sep).join(posix.sep);
}
