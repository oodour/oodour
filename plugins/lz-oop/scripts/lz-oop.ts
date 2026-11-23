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

const command = parseCommand(process.argv.slice(2));

if (command === undefined) {
  process.stderr.write('usage: node lz-oop.ts hotspots [<folder>] [--since <date>] [--limit <count>]\n');
  process.exitCode = 2;
} else if (!statSync(command.scope, { throwIfNoEntry: false })?.isDirectory()) {
  process.stderr.write(`lz-oop: no folder ${command.scope}\n`);
  process.exitCode = 1;
} else {
  const { scope, since, limit } = command;
  const measured = measureScope(scope, since);

  process.stdout.write(renderHotspots(scope, since, measured, rankHotspots(measured.files, limit)));
}
