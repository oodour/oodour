import { isAbsolute, normalize, parse, resolve, sep } from 'node:path';
import { childPath, localPath } from './below.ts';

export const refuse = (reason: string): never => {
  throw new Error(`git: ${reason}`);
};

// Stryker disable next-line ConditionalExpression: the scripts' mutants run on Windows (mutation.yml), where it is true; false is the EqualityOperator mutant's case
const windowsPaths = sep === '\\';

const driveRelative = (name: string): RegExpExecArray | null =>
  // Stryker disable next-line ConditionalExpression: windowsPaths is true where the mutants run, and its own mutants make it false
  windowsPaths ? /^([a-z]:)(?![\\/])(.*)/is.exec(name) : null;

// Not `resolve`, which would take a `..` by its text only; readingsOf takes it both ways. Git on Windows opens a name
// such as `D:sub` from that drive's current folder, which is the folder Git runs in when the base is on that drive, and
// a name such as `\sub` from the root of the drive it runs on.
export function from(base: string, name: string): readonly string[] {
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

// `cwds` are the folders Git may run in, which it reads a name such as `D:sub` from.
export const pathsFrom = (base: string, name: string, cwds: readonly string[]): readonly string[] => [
  ...new Set((driveRelative(name) === null ? [base] : [base, ...cwds]).flatMap((folder) => from(folder, name))),
];

export const readingsFrom = (
  base: string,
  name: string,
  cwds: readonly string[],
  refusal: string,
): ReadonlySet<string> => new Set(pathsFrom(base, name, cwds).flatMap((path) => [...readingsOf(path, refusal)]));

// The system Git runs on takes a `..` by its text or after following the links before it, depending on the platform
// and the call, so a path is read both ways.
export function readingsOf(path: string, refusal = `${path} leads to a network path`): ReadonlySet<string> {
  return new Set([path, normalize(path)].map((reading) => localPath(reading) ?? refuse(refusal)));
}
