import { statSync } from 'node:fs';
import { resolve } from 'node:path';
import { parseArgs } from 'node:util';
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

const usage = 'usage: node lz-oop.ts hotspots [<folder>] [--since <date>] [--limit <count>]\n';

function parseCommand(args: readonly string[]): HotspotsCommand | string {
  let parsed;

  try {
    parsed = parseArgs({
      args: [...args],
      allowPositionals: true,
      options: { since: { type: 'string', default: '12 months ago' }, limit: { type: 'string', default: '30' } },
    });
  } catch (error) {
    return error instanceof Error ? error.message : String(error);
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
  const command = parseCommand(args);

  if (typeof command === 'string') {
    return { status: 2, stdout: '', stderr: `lz-oop: ${command}\n${usage}` };
  }

  const { scope, since, limit } = command;

  // On Windows, opening \\host\share sends the user's credentials to that host; \\?\ and \\.\ can name one too.
  if (process.platform === 'win32' && /^[\\/]{2}/.test(resolve(scope))) {
    return { status: 1, stdout: '', stderr: `lz-oop: ${scope} is a network or device path; audit a local folder\n` };
  }

  if (!statSync(scope, { throwIfNoEntry: false })?.isDirectory()) {
    return { status: 1, stdout: '', stderr: `lz-oop: no folder ${scope}\n` };
  }

  try {
    const measured = measureScope(scope, since);

    return { status: 0, stdout: renderHotspots(scope, since, measured, rankHotspots(measured.files, limit)), stderr: '' };
  } catch (error) {
    return { status: 1, stdout: '', stderr: `lz-oop: ${error instanceof Error ? error.message : String(error)}\n` };
  }
}

if (import.meta.main) {
  const { status, stdout, stderr } = runCommand(process.argv.slice(2));

  process.stdout.write(stdout);
  process.stderr.write(stderr);
  process.exitCode = status;
}
