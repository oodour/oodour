import { lstatSync, readdirSync, readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, isAbsolute, join, normalize, parse, resolve, sep } from 'node:path';
import { cachedLocalPath, childPath, localPath, namesNetworkPath } from './below.ts';
import { gitText } from './git-text.ts';

export type ConfigReader = (file: string) => string;

const mostIncludes = 10;

const refuse = (reason: string): never => {
  throw new Error(`git: ${reason}`);
};

// Not `resolve`, which would take a `..` by its text only; readingsOf takes it both ways. Git on Windows opens a name
// such as `D:sub` from that drive's current folder, which is the folder Git runs in when the base is on that drive, and
// a name such as `\sub` from the root of the drive it runs on.
function from(base: string, name: string): readonly string[] {
  const named = driveRelative(name);

  if (named !== null) {
    // Stryker disable next-line StringLiteral: both groups take part in every match, so neither default is used
    const [, drive = '', rest = ''] = named;
    const sameDrive = base.slice(0, 2).toLowerCase() === drive.toLowerCase();

    // Stryker disable next-line ArrayDeclaration: a name that leads to nothing is local, so one more reading by such a name refuses nothing
    const fromBase = sameDrive ? [childPath(base, rest)] : [];

    return [`${drive}\\${rest}`, resolve(name), ...fromBase];
  }

  if (windowsPaths && /^[\\/](?![\\/])/.test(name)) {
    return [`${parse(base).root}${name.slice(1)}`, name];
  }

  return [isAbsolute(name) ? name : childPath(base, name)];
}

// Stryker disable next-line ConditionalExpression: the mutants run on Windows, where it is true; false is the EqualityOperator mutant's case
const windowsPaths = sep === '\\';

const driveRelative = (name: string): RegExpExecArray | null =>
  // Stryker disable next-line ConditionalExpression: windowsPaths is true where the mutants run, and its own mutants make it false
  windowsPaths ? /^([a-z]:)(?![\\/])(.*)/is.exec(name) : null;

// `cwds` are the folders Git may run in, which it reads a name such as `D:sub` from.
const pathsFrom = (base: string, name: string, cwds: readonly string[]): readonly string[] => [
  ...new Set((driveRelative(name) === null ? [base] : [base, ...cwds]).flatMap((folder) => from(folder, name))),
];

const readingsFrom = (base: string, name: string, cwds: readonly string[], refusal: string): ReadonlySet<string> =>
  new Set(pathsFrom(base, name, cwds).flatMap((path) => [...readingsOf(path, refusal)]));

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

  // Stryker disable next-line MethodExpression,ConditionalExpression,StringLiteral: an empty line names the folder the list is read from, which is local and walked already; leaving it out only spares reading that folder's lists again
  return gitText(readFileSync(local)).split(/\r?\n/).filter((line) => line !== '');
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

    // Stryker disable next-line ConditionalExpression: taken for a link, an entry that is none is its own local path, so it is walked as a folder or left as a file all the same; the check spares reading it again
    if (entry.isSymbolicLink()) {
      assertLocalLinks(localPath(path) ?? refuse(`${path} leads to a network path`), walked);
      // Stryker disable next-line ConditionalExpression: the walk returns at once for anything but a folder; the check spares a file that read
    } else if (entry.isDirectory()) {
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

// A .git folder by its name too: Git reads the relative names in it from there.
function dotGitFolders(folder: string, cwds: readonly string[]): readonly string[] {
  const named = join(folder, '.git');
  const dotGit = localPath(named) ?? refuse(`${named} leads to a network path`);
  const entry = lstatSync(dotGit, { throwIfNoEntry: false });

  if (entry?.isFile() === true) {
    return pointedFolders(dotGit, gitdirOf, folder, cwds);
  }

  // Stryker disable next-line ConditionalExpression,ArrayDeclaration: a .git that does not exist holds nothing to refuse, nor does a git folder by another name that does not exist; naming none only spares looking into them
  return entry === undefined ? [] : [...new Set([named, dotGit])];
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

// The system Git runs on takes a `..` by its text or after following the links before it, depending on the platform
// and the call, so a path is read both ways.
function readingsOf(path: string, refusal = `${path} leads to a network path`): ReadonlySet<string> {
  return new Set([path, normalize(path)].map((reading) => localPath(reading) ?? refuse(refusal)));
}

// Which values Git reads as paths, and from where, depends on the key and the command; every value is checked as a
// path from every folder Git could read it from.
interface ConfigCheck {
  readonly readConfig: ConfigReader;
  readonly local: (path: string) => string | undefined;
  readonly places: readonly string[];
}

function assertLocalConfig(file: string, check: ConfigCheck, depth = 0): void {
  for (const local of readingsOf(file)) {
    if (lstatSync(local, { throwIfNoEntry: false }) !== undefined) {
      assertLocalConfigReading(file, local, check, depth);
    }
  }
}

function assertLocalConfigReading(file: string, local: string, check: ConfigCheck, depth: number): void {
  if (depth > mostIncludes) {
    refuse(`${file} is included more than ${String(mostIncludes)} deep`);
  }

  // `git config --list -z` writes each entry as its key, a newline and its value (none for a bare key), then a NUL.
  for (const entry of check.readConfig(local).split('\0')) {
    const key = entry.replace(/\n.*/s, '');
    const value = entry.slice(key.length + 1);

    // Git reaches no remote here (GIT_ALLOW_PROTOCOL=none, no lazy fetch), so a remote may live anywhere.
    if (/^remote\..+\.(?:url|pushurl)$/.test(key)) {
      continue;
    }

    for (const path of pathsIn(value)) {
      const fromHome = path.startsWith('~/');
      const name = fromHome ? path.slice(2) : path;

      if (namesNetworkPath(path)) {
        refuse(`${key} in ${local} names a network path (${value})`);
      }

      const leadsToNetwork = (reading: string): boolean => check.local(reading) === undefined;
      const readings = (fromHome ? [homedir()] : check.places).flatMap((place) => from(place, name));

      if (readings.flatMap((reading) => [reading, normalize(reading)]).some(leadsToNetwork)) {
        refuse(`${key} in ${local} leads to a network path (${value})`);
      }

      // Git reads a relative include from the folder of the config file as it named it, before any link, and one
      // named from its drive from the folder Git runs in.
      if (key === 'include.path' || /^includeif\..+\.path$/.test(key)) {
        const folders = fromHome ? [homedir()] : [dirname(file), dirname(local)];

        for (const included of new Set(folders.flatMap((base) => pathsFrom(base, name, check.places)))) {
          assertLocalConfig(included, check, depth + 1);
        }
      }
    }
  }
}

// Git reads some values as a path only after a prefix: `:(optional)`, `%(prefix)/`, or a format such as `files://`.
function pathsIn(value: string): ReadonlySet<string> {
  const required = value.replace(/^:\(optional\)/, '');
  const unprefixed = required.replace(/^%\(prefix\)\//, '');

  return new Set([value, required, unprefixed, unprefixed.replace(/^[a-z][a-z0-9+.-]*:\/\//i, '')]);
}
