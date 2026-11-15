// PreToolUse: keeps every agent except the oracle agents out of the sealed store (.oracle/).
// Rules and permitted routes: AGENTS.md, "Oracle firewall".

import { readFileSync } from 'node:fs';
import { basename, normalize, sep } from 'node:path';
import { denyOutput, type HookInput, isRecord, readHookInput, stringField } from './hook-input.ts';

// Same pattern as .claude/mods/oracle-scrub/hooks/scrub.ts; oracle-guard.test.ts guards the copy.
export const storePath = /(?<![A-Za-z0-9_-])\.oracle(?![A-Za-z0-9_-])/i;

const readers: ReadonlySet<string> = new Set(['oracle', 'oracle-reviewer']);
const curators: ReadonlySet<string> = new Set(['oracle-curator']);
const oracleAgents: ReadonlySet<string> = new Set([...readers, ...curators]);
const readerTools: ReadonlySet<string> = new Set(['Read', 'Glob']);
const shellTools: ReadonlySet<string> = new Set(['Bash', 'PowerShell', 'Monitor']);
const searchTools: ReadonlySet<string> = new Set(['Glob', 'Grep']);
// Arguments are separated by spaces or tabs only: a newline or a shell operator would start a second command.
const storeTools = /^node[ \t]+tools[\\/](?:source-overlap|store-check)\.ts(?:[ \t]+[^\s|;&<>`$()]+)*[ \t]*$/;
// An oracle agent's transcript holds the store text it read.
const subagentsFolder = /[\\/]\.claude[\\/]projects[\\/](?:[^\\/]+[\\/])*subagents(?:[\\/]|$)/i;
const transcripts = /[^\s"'|;&<>`]*[\\/]subagents[\\/]agent-[^\\/\s"'|;&<>`]+\.jsonl/gi;

const pathFields: Readonly<Record<string, readonly string[]>> = {
  Read: ['file_path'],
  Edit: ['file_path'],
  MultiEdit: ['file_path'],
  Write: ['file_path'],
  NotebookEdit: ['notebook_path'],
  Glob: ['path', 'pattern'],
  Grep: ['path', 'glob'],
  LSP: ['filePath'],
};

const deniedReason = [
  'oracle-guard: this call reaches the sealed store (.oracle/), which only the oracle agents may open.',
  "Permitted routes: ask the `oracle` agent (a question plus one entry's index path as a string);",
  'gate a draft with `oracle-reviewer`; check a text for copied wording with `node tools/source-overlap.ts <file>`;',
  'check that the store and its indexes agree with `node tools/store-check.ts`;',
  'read the listing at .oracle/README.md; search for the literal string ".oracle" with the Grep tool and a path outside the store;',
  'import or change store files through the `oracle-curator` agent, or ask Lars to run the command with `!`.',
].join(' ');

// The listing is readable by anyone: a path whose only store segment is followed by README.md alone.
function isListing(path: string): boolean {
  const segments = normalize(path).split(sep).filter((segment) => segment !== '');
  const storeSegments = segments.filter((segment) => segment.toLowerCase() === '.oracle');
  const last = segments.at(-1)?.toLowerCase();
  const beforeLast = segments.at(-2)?.toLowerCase();

  return storeSegments.length === 1 && beforeLast === '.oracle' && last === 'readme.md';
}

function targets(input: HookInput): readonly string[] {
  const toolName = input.toolName ?? '';

  if (shellTools.has(toolName)) {
    return [stringField(input.toolInput, 'command') ?? ''];
  }

  const fields = pathFields[toolName];

  if (fields !== undefined) {
    return fields.map((field) => stringField(input.toolInput, field) ?? '');
  }

  return Object.entries(input.toolInput).flatMap(([key, value]) =>
    /path|file|dir|uri|root/i.test(key) && typeof value === 'string' ? [value] : [],
  );
}

function readsOracleTranscript(input: HookInput, agentTypeOf?: (path: string) => string | undefined): boolean {
  const values = targets(input);
  const searchRoot = searchTools.has(input.toolName ?? '') ? values.join('/') : '';
  const transcriptPaths = values.flatMap((value) => value.match(transcripts) ?? []);

  return (
    subagentsFolder.test(searchRoot) ||
    transcriptPaths.some((path) => {
      const owner = agentTypeOf?.(path);

      return owner === undefined || oracleAgents.has(owner);
    })
  );
}

export function decide(input: HookInput, agentTypeOf?: (path: string) => string | undefined): string | undefined {
  const toolName = input.toolName ?? '';
  const agentType = input.agentType ?? '';

  if (readsOracleTranscript(input, agentTypeOf)) {
    return deniedReason;
  }

  if (curators.has(agentType) || (readers.has(agentType) && readerTools.has(toolName))) {
    return undefined;
  }

  if (toolName === 'Read' && isListing(stringField(input.toolInput, 'file_path') ?? '')) {
    return undefined;
  }

  if (shellTools.has(toolName) && storeTools.test(stringField(input.toolInput, 'command') ?? '')) {
    return undefined;
  }

  return targets(input).some((value) => storePath.test(value)) ? deniedReason : undefined;
}

// Claude Code writes agent-<id>.meta.json beside each subagent transcript; undefined when it cannot be read.
function transcriptOwner(path: string): string | undefined {
  try {
    const meta: unknown = JSON.parse(readFileSync(path.replace(/\.jsonl$/i, '.meta.json'), 'utf8'));

    return isRecord(meta) ? stringField(meta, 'agentType') : undefined;
  } catch {
    return undefined;
  }
}

// Fails closed: a guard that cannot read its input denies the call rather than letting it through.
export function run(read: () => HookInput, write: (output: string) => void): void {
  let reason: string | undefined;

  try {
    reason = decide(read(), transcriptOwner);
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
