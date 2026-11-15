// PreToolUse: keeps every agent except the oracle agents out of the sealed store (.oracle/).
// The decision lives in the oracle-guard mod's decide.ts, which this hook and the mod share.
// Rules and permitted routes: AGENTS.md, "Oracle firewall".

import { readFileSync } from 'node:fs';
import { basename } from 'node:path';
import { decide, metaPathOf, ownerFromMeta } from '../mods/oracle-guard/hooks/decide.ts';
import { denyOutput, type HookInput, readHookInput } from './hook-input.ts';

export { decide, type DecideOptions, storePath } from '../mods/oracle-guard/hooks/decide.ts';

// Undefined when the metadata file beside the transcript cannot be read.
function transcriptOwner(path: string): string | undefined {
  try {
    return ownerFromMeta(readFileSync(metaPathOf(path), 'utf8'));
  } catch {
    return undefined;
  }
}

// Fails closed: a guard that cannot read its input denies the call rather than letting it through.
export function run(read: () => HookInput, write: (output: string) => void): void {
  let reason: string | undefined;

  try {
    reason = decide(read(), { agentTypeOf: transcriptOwner, projectDir: process.env['CLAUDE_PROJECT_DIR'] });
  } catch (error) {
    reason = `oracle-guard: the guard failed (${error instanceof Error ? error.message : String(error)}), so the call was denied.`;
  }

  if (reason !== undefined) {
    write(denyOutput(reason));
  }
}

if (process.argv[1] !== undefined && basename(process.argv[1]) === 'oracle-guard.ts') {
  run(readHookInput, (output) => process.stdout.write(output));
}
