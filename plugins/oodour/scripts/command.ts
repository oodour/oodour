import { statSync } from 'node:fs';
import { resolve } from 'node:path';
import { parseArgs } from 'node:util';
import { localPath } from './below.ts';
import { measureScope, rankHotspots, renderHotspots } from './hotspots.ts';

interface HotspotsCommand {
  readonly scope: string;
  readonly since: string;
  readonly limit: number;
}

export interface CommandResult {
  readonly status: number;
  readonly stdout: string;
  readonly stderr: string;
}

const usage =
  'usage: node oodour.ts [--trusted-repository] hotspots [--since <date>] [--limit <count>] [-- <folder>]\n';
const trustFlag = '--trusted-repository';

function parseCommand(args: readonly string[]): HotspotsCommand | string {
  let parsed;

  try {
    parsed = parseArgs({
      args: [...args],
      allowPositionals: true,
      options: {
        since: { type: 'string', default: '12 months ago' },
        limit: { type: 'string', default: '30' },
        'trusted-repository': { type: 'boolean' },
      },
    });
  } catch (error) {
    return error instanceof Error ? error.message : String(error);
  }

  // Trust is read from the first argument only, so a flag that ends a longer command line grants nothing.
  if (parsed.values['trusted-repository'] === true) {
    return `${trustFlag} goes first, before the command`;
  }

  const [command, scope = '.', extra] = parsed.positionals;
  const limit = Number(parsed.values.limit);

  if (command === undefined) {
    return 'no command';
  }

  if (command !== 'hotspots') {
    return `unknown command ${command}`;
  }

  if (extra !== undefined) {
    return `one folder at most, not ${extra}`;
  }

  if (!Number.isInteger(limit) || limit < 1) {
    return `--limit takes a whole number of 1 or more, not ${parsed.values.limit}`;
  }

  return { scope, since: parsed.values.since, limit };
}

export function runCommand(args: readonly string[]): CommandResult {
  const trusted = args[0] === trustFlag;
  const command = parseCommand(trusted ? args.slice(1) : args);

  if (typeof command === 'string') {
    return { status: 2, stdout: '', stderr: `oodour: ${command}\n${usage}` };
  }

  const { scope, since, limit } = command;
  // Windows and Node.js apply a `..` by text, so the folder is checked and read by the same resolved text.
  const folder = resolve(scope);

  // On Windows, opening \\host\share sends the user's credentials to that host, so the folder's links are read first.
  if (localPath(folder) === undefined) {
    return {
      status: 1,
      stdout: '',
      stderr: `oodour: ${scope} is a network or device path, or leads to one; audit a local folder\n`,
    };
  }

  if (!statSync(folder, { throwIfNoEntry: false })?.isDirectory()) {
    return { status: 1, stdout: '', stderr: `oodour: no folder ${scope}\n` };
  }

  try {
    const measured = measureScope(folder, since, trusted);

    return {
      status: 0,
      stdout: renderHotspots(
        scope,
        since,
        measured,
        rankHotspots(measured.files, limit),
      ),
      stderr: '',
    };
  } catch (error) {
    return {
      status: 1,
      stdout: '',
      stderr: `oodour: ${error instanceof Error ? error.message : String(error)}\n`,
    };
  }
}
