// What the oracle guard decides for one tool call: the one copy that the classic hook
// (.claude/hooks/oracle-guard.ts) and this mod both import. A hooks module cannot import a
// Node.js built-in or a file outside its plugin folder, so this file uses neither.
// Rules and permitted routes: AGENTS.md, "Oracle firewall".

import { pathSegments, resolvePath } from './paths.ts';

// Same pattern as .claude/mods/oracle-scrub/hooks/scrub.ts; oracle-guard.test.ts guards the copy.
export const storePath = /(?<![A-Za-z0-9_-])\.oracle(?![A-Za-z0-9_-])/i;

const readers: ReadonlySet<string> = new Set(['oracle', 'oracle-reviewer']);
const curators: ReadonlySet<string> = new Set(['oracle-curator']);
const oracleAgents: ReadonlySet<string> = new Set([...readers, ...curators]);
const readerTools: ReadonlySet<string> = new Set(['Read', 'Glob']);
const shellTools: ReadonlySet<string> = new Set(['Bash', 'PowerShell', 'Monitor']);
const searchTools: ReadonlySet<string> = new Set(['Glob', 'Grep']);
// Free text in these carries an index path on the permitted route (a brief to the oracle), so it is not inspected.
const messageTools: ReadonlySet<string> = new Set([
  'Agent',
  'SendMessage',
  'SubagentHandback',
  'TaskCreate',
  'TaskUpdate',
  'Skill',
  'ScheduleWakeup',
  'CronCreate',
  'PushNotification',
  'SendFeedback',
  'TodoWrite',
  'ExitPlanMode',
]);
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

const writeTools: ReadonlySet<string> = new Set(['Write', 'Edit', 'MultiEdit', 'NotebookEdit']);

const curatorWriteReason =
  'oracle-guard: the oracle-curator writes only inside the sealed store (.oracle/). A file it wrote anywhere else would carry store text to other agents.';

const lowThresholdReason =
  'oracle-guard: run `node tools/source-overlap.ts` with `--min-words` 6 or more. A lower threshold turns the tool into a probe of the source\'s wording.';

// The fields of a tool call the guard reads, as the classic hook's input and the mod's event both carry them.
export interface GuardCall {
  readonly toolName: string | undefined;
  readonly toolInput: Readonly<Record<string, unknown>>;
  readonly agentType: string | undefined;
  readonly cwd: string | undefined;
}

export function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function stringField(record: Readonly<Record<string, unknown>>, key: string): string | undefined {
  const value = record[key];

  return typeof value === 'string' ? value : undefined;
}

// The listing is readable by anyone: a path whose only store segment is followed by README.md alone.
function isListing(path: string): boolean {
  const segments = pathSegments(path);
  const storeSegments = segments.filter((segment) => segment.toLowerCase() === '.oracle');
  const last = segments.at(-1)?.toLowerCase();
  const beforeLast = segments.at(-2)?.toLowerCase();

  return storeSegments.length === 1 && beforeLast === '.oracle' && last === 'readme.md';
}

// A missing or non-text field reads as empty.
function inputText(call: GuardCall, key: string): string {
  // Stryker disable next-line StringLiteral: no caller tells the empty fallback from other text without a store name, a transcript path or source-overlap
  return stringField(call.toolInput, key) ?? '';
}

function targets(call: GuardCall): readonly string[] {
  // Stryker disable next-line StringLiteral: no tool set or path field table holds the fallback name, so a missing tool name is judged alike
  const toolName = call.toolName ?? '';

  if (shellTools.has(toolName)) {
    return [inputText(call, 'command')];
  }

  const fields = pathFields[toolName];

  if (fields !== undefined) {
    return fields.map((field) => inputText(call, field));
  }

  // Stryker disable next-line ArrayDeclaration: an extra target without a store name or a transcript path changes no verdict
  return messageTools.has(toolName) ? [] : strings(call.toolInput);
}

function strings(value: unknown): readonly string[] {
  if (typeof value === 'string') {
    return [value];
  }

  if (Array.isArray(value)) {
    return value.flatMap(strings);
  }

  if (!isRecord(value)) {
    // Stryker disable next-line ArrayDeclaration: an extra target without a store name or a transcript path changes no verdict
    return [];
  }

  return Object.entries(value).flatMap(([key, item]) => [key, ...strings(item)]);
}

// The subagent transcripts a call names, as decide() passes them to agentTypeOf.
export function transcriptPaths(call: GuardCall): readonly string[] {
  return targets(call).flatMap((value) => value.match(transcripts) ?? []);
}

// Claude Code writes agent-<id>.meta.json beside each subagent transcript.
export function metaPathOf(transcriptPath: string): string {
  return transcriptPath.replace(/\.jsonl$/i, '.meta.json');
}

// The agent type a transcript's metadata file names; undefined when the text is not that metadata.
export function ownerFromMeta(text: string): string | undefined {
  try {
    const meta: unknown = JSON.parse(text);

    return isRecord(meta) ? stringField(meta, 'agentType') : undefined;
  } catch {
    return undefined;
  }
}

function readsOracleTranscript(call: GuardCall, agentTypeOf?: (path: string) => string | undefined): boolean {
  const searched = call.toolName !== undefined && searchTools.has(call.toolName);

  return (
    (searched && subagentsFolder.test(targets(call).join('/'))) ||
    transcriptPaths(call).some((path) => {
      const owner = agentTypeOf?.(path);

      return owner === undefined || oracleAgents.has(owner);
    })
  );
}

// Below six words the overlap tool's hit positions let a caller test candidate wording against the source.
function lowThreshold(command: string): boolean {
  return (
    command.includes('source-overlap') &&
    [...command.matchAll(/--min-words(?:[ \t]+(\S*))?/g)].some(([, value]) => !(Number(value) >= 6 && Number.isInteger(Number(value))))
  );
}

// Case-insensitive, as the Windows file systems this project runs on are.
function isProjectDir(cwd: string | undefined, projectDir: string | undefined): boolean {
  return cwd !== undefined && projectDir !== undefined && resolvePath(cwd, '').toLowerCase() === resolvePath(projectDir, '').toLowerCase();
}

export interface DecideOptions {
  // Reads the agent type that owns a subagent transcript; undefined when it cannot tell.
  readonly agentTypeOf?: (path: string) => string | undefined;
  // The project directory: CLAUDE_PROJECT_DIR in the hook process, the session's root in the mod.
  readonly projectDir?: string | undefined;
}

// The reason to deny the call, or undefined to let it run.
export function decide(call: GuardCall, { agentTypeOf, projectDir }: DecideOptions = {}): string | undefined {
  // Stryker disable next-line StringLiteral: no tool set holds the fallback name, so a missing tool name is judged alike
  const toolName = call.toolName ?? '';
  // Stryker disable next-line StringLiteral: no agent set holds the fallback name, so a missing agent type is judged alike
  const agentType = call.agentType ?? '';

  if (readsOracleTranscript(call, agentTypeOf)) {
    return deniedReason;
  }

  if (shellTools.has(toolName) && lowThreshold(inputText(call, 'command'))) {
    return lowThresholdReason;
  }

  // Inside means below this project's store folder, compared case-insensitively as Windows paths are.
  if (curators.has(agentType) && writeTools.has(toolName)) {
    const store = projectDir === undefined ? undefined : `${resolvePath(projectDir, '.oracle').toLowerCase()}\\`;
    // Stryker disable next-line StringLiteral: unreachable, since store is set only when projectDir is
    const inside = (path: string): boolean => store !== undefined && resolvePath(call.cwd ?? projectDir ?? '', path).toLowerCase().startsWith(store);

    // Stryker disable next-line MethodExpression: every write tool names one path, so every and some agree
    return targets(call).every(inside) ? undefined : curatorWriteReason;
  }

  if (curators.has(agentType) || (readers.has(agentType) && readerTools.has(toolName))) {
    return undefined;
  }

  if (toolName === 'Read' && isListing(inputText(call, 'file_path'))) {
    return undefined;
  }

  // The tool paths are relative, so the exception holds only where they resolve to this project's tools.
  if (shellTools.has(toolName) && isProjectDir(call.cwd, projectDir) && storeTools.test(inputText(call, 'command'))) {
    return undefined;
  }

  return targets(call).some((value) => storePath.test(value)) ? deniedReason : undefined;
}
