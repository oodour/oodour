import { lstatSync, readdirSync, readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, isAbsolute, join, sep } from 'node:path';
import { localPath, namesNetworkPath } from './below.ts';

export type ConfigReader = (file: string) => string;

const mostIncludes = 10;

const refuse = (reason: string): never => {
  throw new Error(`git: ${reason}`);
};

// Not `resolve`, which would apply a `..` by its text before localPath walks it.
const from = (base: string, name: string): string => (isAbsolute(name) ? name : `${base}${sep}${name}`);

// Git opens the files its metadata names, wherever they are, and on Windows opening \\host\share sends the user's
// credentials to that host. So the metadata is read here first, without git, and a network path in it refuses the
// repository.
export function assertLocalMetadata(folder: string, readConfig: ConfigReader): void {
  const real = localPath(folder) ?? refuse(`${folder} is a network or device path, or leads to one`);
  const gitFolder = gitFolderAbove(real);

  if (gitFolder === undefined) {
    return;
  }

  const commondir = join(gitFolder, 'commondir');
  const commonFolder =
    (lstatSync(commondir, { throwIfNoEntry: false })?.isFile() === true
      ? pointedFolder(commondir, /^(.+)$/m, gitFolder)
      : undefined) ?? gitFolder;

  assertLocalConfig(join(commonFolder, 'config'), readConfig);
  assertLocalConfig(join(gitFolder, 'config.worktree'), readConfig);

  for (const metadataFolder of new Set([gitFolder, commonFolder])) {
    assertLocalLinks(metadataFolder);
  }

  // Objects borrowed from another repository are read from wherever it is.
  const borrowed = ['alternates', 'http-alternates']
    .map((name) => join(commonFolder, 'objects', 'info', name))
    .find((path) => (lstatSync(path, { throwIfNoEntry: false })?.size ?? 0) > 0);

  if (borrowed !== undefined) {
    refuse(`the repository borrows objects from elsewhere (${borrowed})`);
  }
}

// readdirSync with `recursive` goes through links, so the folders are walked one at a time and a link is only read.
function assertLocalLinks(folder: string): void {
  for (const entry of readdirSync(folder, { withFileTypes: true })) {
    const path = join(folder, entry.name);

    if (entry.isSymbolicLink()) {
      if (localPath(path) === undefined) {
        refuse(`${path} leads to a network path`);
      }
    } else if (entry.isDirectory()) {
      assertLocalLinks(path);
    }
  }
}

function gitFolderAbove(folder: string): string | undefined {
  const dotGit = join(folder, '.git');
  const entry = lstatSync(dotGit, { throwIfNoEntry: false });

  if (entry?.isFile() === true) {
    return pointedFolder(dotGit, /^gitdir: (.+)$/m, folder);
  }

  if (entry !== undefined) {
    return localPath(dotGit) ?? refuse(`${dotGit} leads to a network path`);
  }

  const isBare =
    lstatSync(join(folder, 'HEAD'), { throwIfNoEntry: false })?.isFile() === true &&
    ['objects', 'refs'].every((name) => lstatSync(join(folder, name), { throwIfNoEntry: false })?.isDirectory() === true);

  if (isBare) {
    return folder;
  }

  return dirname(folder) === folder ? undefined : gitFolderAbove(dirname(folder));
}

// A file such as .git or commondir that names another folder; a relative name is read from `base`.
function pointedFolder(file: string, pattern: RegExp, base: string): string | undefined {
  const named = pattern.exec(readFileSync(file, 'utf8'))?.[1]?.trim();

  if (named === undefined) {
    return undefined;
  }

  if (namesNetworkPath(named)) {
    refuse(`${file} points to a network path (${named})`);
  }

  return localPath(from(base, named)) ?? refuse(`${file} points to a path that leads to a network path (${named})`);
}

function assertLocalConfig(file: string, readConfig: ConfigReader, depth = 0): void {
  const local = localPath(file) ?? refuse(`${file} leads to a network path`);

  if (lstatSync(local, { throwIfNoEntry: false }) === undefined) {
    return;
  }

  if (depth > mostIncludes) {
    refuse(`${file} is included more than ${String(mostIncludes)} deep`);
  }

  // `git config --list -z` writes each entry as its key, a newline and its value (none for a bare key), then a NUL.
  for (const entry of readConfig(local).split('\0')) {
    const newline = entry.indexOf('\n');
    const key = newline === -1 ? entry : entry.slice(0, newline);
    const value = newline === -1 ? '' : entry.slice(newline + 1);

    if (namesNetworkPath(value)) {
      refuse(`${key} in ${local} names a network path (${value})`);
    }

    if (key === 'include.path' || /^includeif\..+\.path$/.test(key)) {
      const included = value.startsWith('~/') ? from(homedir(), value.slice(2)) : from(dirname(local), value);

      assertLocalConfig(included, readConfig, depth + 1);
    }
  }
}
