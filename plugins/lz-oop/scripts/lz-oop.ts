import { statSync } from 'node:fs';
import { parseArgs } from 'node:util';
import { measureScope, rankHotspots, renderHotspots } from './hotspots.ts';

interface HotspotsCommand {
  readonly scope: string;
  readonly since: string;
  readonly limit: number;
}

function parseCommand(args: readonly string[]): HotspotsCommand | undefined {
  let parsed;

  try {
    parsed = parseArgs({
      args: [...args],
      allowPositionals: true,
      options: { since: { type: 'string', default: '12 months ago' }, limit: { type: 'string', default: '30' } },
    });
  } catch {
    return undefined;
  }

  const [command, scope = '.', ...extra] = parsed.positionals;
  const limit = Number(parsed.values.limit);

  if (command !== 'hotspots' || extra.length > 0 || !Number.isInteger(limit) || limit < 1) {
    return undefined;
  }

  return { scope, since: parsed.values.since, limit };
}

export interface CommandResult {
  readonly status: number;
  readonly stdout: string;
  readonly stderr: string;
}

export function runCommand(args: readonly string[]): CommandResult {
  const command = parseCommand(args);

  if (command === undefined) {
    return { status: 2, stdout: '', stderr: 'usage: node lz-oop.ts hotspots [<folder>] [--since <date>] [--limit <count>]\n' };
  }

  const { scope, since, limit } = command;

  if (!statSync(scope, { throwIfNoEntry: false })?.isDirectory()) {
    return { status: 1, stdout: '', stderr: `lz-oop: no folder ${scope}\n` };
  }

  const measured = measureScope(scope, since);

  return { status: 0, stdout: renderHotspots(scope, since, measured, rankHotspots(measured.files, limit)), stderr: '' };
}

if (import.meta.main) {
  const { status, stdout, stderr } = runCommand(process.argv.slice(2));

  process.stdout.write(stdout);
  process.stderr.write(stderr);
  process.exitCode = status;
}
