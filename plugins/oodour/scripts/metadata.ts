import { lstatSync, readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { cachedLocalPath, localPath, namesNetworkPath } from './below.ts';
import { gitText } from './git-text.ts';
import { assertLocalConfig, type ConfigCheck, type ConfigReader } from './metadata-config.ts';
import { readingsFrom, refuse } from './metadata-paths.ts';

// Git opens the files its metadata names, wherever they are, and on Windows opening \\host\share sends the user's
// credentials to that host. So the metadata is read here first, without git, and a network path in it refuses the
// repository.
export function assertLocalMetadata(folder: string, readConfig: ConfigReader): void {
  const real = localPath(folder) ?? refuse(`${folder} is a network or device path, or leads to one`);
  // The top of the work tree, which Git reads a relative path in the config from, holds the folder.
  const workTreeTops = foldersUpFrom(real);

  // Git takes the first git folder on the way up that it accepts as one, and its rules for that have more corners
  // than a copy of them would keep up with. So every folder it could take is checked.
  const check = { readConfig, local: cachedLocalPath() };

  for (const gitFolder of workTreeTops.flatMap((folder) => gitFoldersIn(folder, workTreeTops))) {
    assertLocalRepository(gitFolder, workTreeTops, check);
  }
}

const foldersUpFrom = (folder: string): readonly string[] =>
  dirname(folder) === folder ? [folder] : [folder, ...foldersUpFrom(dirname(folder))];

function assertLocalRepository(
  gitFolder: string,
  workTreeTops: readonly string[],
  { readConfig, local }: Omit<ConfigCheck, 'places'>,
): void {
  const commondir =
    localPath(join(gitFolder, 'commondir')) ?? refuse(`${join(gitFolder, 'commondir')} leads to a network path`);
  const pointed =
    lstatSync(commondir, { throwIfNoEntry: false })?.isFile() === true
      ? pointedFolders(commondir, commondirOf, gitFolder, workTreeTops)
      : [];
  const commonFolders = pointed.length === 0 ? [gitFolder] : pointed;
  const check = { readConfig, local, places: [...new Set([...workTreeTops, gitFolder, ...commonFolders])] };

  for (const commonFolder of commonFolders) {
    assertLocalConfig(join(commonFolder, 'config'), check);
  }

  assertLocalConfig(join(gitFolder, 'config.worktree'), check);

  const walked = new Set<string>();

  for (const metadataFolder of [gitFolder, ...commonFolders]) {
    assertLocalLinks(metadataFolder, walked);
  }

  for (const commonFolder of commonFolders) {
    assertLocalAlternates(join(commonFolder, 'objects'), walked, check.places);
  }

  for (const metadataFolder of [gitFolder, ...commonFolders]) {
    assertLocalTables(join(metadataFolder, 'reftable'));
  }
}

// Git reads each table that tables.list names from the reftable folder.
function assertLocalTables(reftable: string): void {
  const file = join(reftable, 'tables.list');

  for (const line of linesOf(file)) {
    if (namesNetworkPath(line)) {
      refuse(`${file} names a network path (${line})`);
    }

    // Stryker disable next-line ArrayDeclaration: a name from its drive is read from a folder only when the folder is on that drive, and the mutant's folder is on none
    readingsFrom(reftable, line, [], `${file} names a path that leads to a network path (${line})`);
  }
}

function linesOf(file: string): readonly string[] {
  const local = localPath(file) ?? refuse(`${file} leads to a network path`);

  if (lstatSync(local, { throwIfNoEntry: false })?.isFile() !== true) {
    // Stryker disable next-line ArrayDeclaration: a line that names a folder that does not exist refuses nothing
    return [];
  }

  // Stryker disable next-line MethodExpression: an empty line names the folder the list is read from, which is local and walked already, so keeping it refuses nothing more
  return gitText(readFileSync(local)).split(/\r?\n/).filter(Boolean);
}

// Git reads borrowed objects from the folders an alternates file names, each line a path from the objects folder. It
// takes the alternates files of borrowed folders too, down to a folder this many borrowings deep, and reads the objects
// of the folders that one names but not their alternates.
const mostAlternates = 5;

function assertLocalAlternates(objects: string, walked: Set<string>, cwds: readonly string[], depth = 0): void {
  if (depth > mostAlternates) {
    return;
  }

  for (const file of [join(objects, 'info', 'alternates'), join(objects, 'info', 'http-alternates')]) {
    for (const line of linesOf(file)) {
      const refusal = `${file} names a network path (${line})`;
      const lent = namesNetworkPath(line) ? refuse(refusal) : readingsFrom(objects, line, cwds, refusal);

      for (const reading of lent) {
        assertLocalLinks(reading, walked);
        assertLocalAlternates(reading, walked, cwds, depth + 1);
      }
    }
  }
}

// readdirSync with `recursive` goes through links, so the folders are walked one at a time, a link is only read, and
// the local folder a link leads to is walked in turn, once.
function assertLocalLinks(folder: string, walked: Set<string>): void {
  if (walked.has(folder) || lstatSync(folder, { throwIfNoEntry: false })?.isDirectory() !== true) {
    return;
  }

  walked.add(folder);

  for (const entry of readdirSync(folder, { withFileTypes: true })) {
    const path = join(folder, entry.name);

    // Stryker disable next-line ConditionalExpression: `true` takes every entry for a link, and an entry that is none is its own local path, so it is walked or left all the same; `false`, which follows no link, is killed by "a link in the git folder that leads to a network path is refused before Git runs"
    if (entry.isSymbolicLink()) {
      assertLocalLinks(localPath(path) ?? refuse(`${path} leads to a network path`), walked);

      continue;
    }

    // Stryker disable next-line ConditionalExpression: `true` walks every entry, and the walk returns at once for anything but a folder; `false`, which walks no subfolder, is killed by "a link that leads to a network path in a folder below the git folder is refused, naming the link"
    if (entry.isDirectory()) {
      assertLocalLinks(path, walked);
    }
  }
}

// The folder's .git, then the folder itself as a bare repository.
function gitFoldersIn(folder: string, cwds: readonly string[]): readonly string[] {
  const has = (name: string): boolean => lstatSync(join(folder, name), { throwIfNoEntry: false }) !== undefined;
  const bare = has('HEAD') && (has('commondir') || (has('objects') && has('refs')));
  // Stryker disable next-line ArrayDeclaration: a git folder that does not exist holds nothing to refuse
  const bareFolders = bare ? [folder] : [];

  return [...dotGitFolders(folder, cwds), ...bareFolders];
}

// A .git folder by its name too: Git reads the relative names in it from there. A .git that does not exist holds
// nothing to refuse, so it is looked into all the same.
function dotGitFolders(folder: string, cwds: readonly string[]): readonly string[] {
  const named = join(folder, '.git');
  const dotGit = localPath(named) ?? refuse(`${named} leads to a network path`);

  if (lstatSync(dotGit, { throwIfNoEntry: false })?.isFile() === true) {
    return pointedFolders(dotGit, gitdirOf, folder, cwds);
  }

  return [...new Set([named, dotGit])];
}

// Git reads all of a .git file after `gitdir: `, and all of a commondir file, less the line ends at its end.
const commondirOf = (text: string): string => text.replace(/[\r\n]+$/, '');
const gitdirOf = (text: string): string | undefined =>
  text.startsWith('gitdir: ') ? commondirOf(text.slice('gitdir: '.length)) : undefined;

// A file such as .git or commondir that names another folder; a relative name is read from `base`.
function pointedFolders(
  file: string,
  nameIn: (text: string) => string | undefined,
  base: string,
  cwds: readonly string[],
): readonly string[] {
  const named = nameIn(gitText(readFileSync(file)));

  if (named === undefined) {
    // Stryker disable next-line ArrayDeclaration: a git folder that does not exist holds nothing to refuse
    return [];
  }

  if (namesNetworkPath(named)) {
    refuse(`${file} points to a network path (${named})`);
  }

  return [...readingsFrom(base, named, cwds, `${file} points to a path that leads to a network path (${named})`)];
}
