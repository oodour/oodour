#!/usr/bin/env node
// PreToolUse: keeps every agent except the oracle agents out of the sealed store (.oracle/).
// Rules and permitted routes: AGENTS.md, "Oracle firewall".

import { readFileSync } from 'node:fs';

// Same pattern as .claude/mods/oracle-scrub/hooks/register.ts; tools/oracle-hooks.test.mjs guards the copy.
export const storePath = /(^|[\\/"'\s=:])\.oracle([\\/"'\s]|$)/i;

const readers = new Set(['oracle', 'oracle-reviewer']);
const curators = new Set(['oracle-curator']);
const listing = /(^|[\\/])\.oracle[\\/]README\.md$/i;
const overlapTool = /^node\s+tools[\\/]source-overlap\.mjs(\s+[^\s|;&<>`$()]+)*\s*$/;

const pathFields = {
  Read: ['file_path'],
  Edit: ['file_path'],
  MultiEdit: ['file_path'],
  Write: ['file_path'],
  NotebookEdit: ['notebook_path'],
  Glob: ['path', 'pattern'],
  Grep: ['path', 'glob'],
  LSP: ['filePath'],
};

function targets(toolName, toolInput) {
  if (toolName === 'Bash' || toolName === 'PowerShell') {
    return [toolInput.command ?? ''];
  }

  const fields = pathFields[toolName];

  if (fields) {
    return fields.map((field) => toolInput[field] ?? '');
  }

  return Object.entries(toolInput)
    .filter(([key, value]) => /path|file|dir|uri|root/i.test(key) && typeof value === 'string')
    .map(([, value]) => value);
}

export function decide({ tool_name: toolName, tool_input: toolInput = {}, agent_type: agentType }) {
  if (curators.has(agentType) || (readers.has(agentType) && ['Read', 'Glob'].includes(toolName))) {
    return undefined;
  }

  if (toolName === 'Read' && listing.test(toolInput.file_path ?? '')) {
    return undefined;
  }

  if ((toolName === 'Bash' || toolName === 'PowerShell') && overlapTool.test((toolInput.command ?? '').trim())) {
    return undefined;
  }

  if (!targets(toolName, toolInput).some((value) => storePath.test(value))) {
    return undefined;
  }

  return [
    `oracle-guard: ${toolName} reaches the sealed store (.oracle/), which only the oracle agents may open.`,
    'Permitted routes: ask the `oracle` agent (a question plus one entry\'s index path as a string);',
    'gate a draft with `oracle-reviewer`; check a text for copied wording with `node tools/source-overlap.mjs <file>`;',
    'read the listing at .oracle/README.md; search for the literal string ".oracle" with the Grep tool and a path outside the store;',
    'import or change store files through the `oracle-curator` agent, or ask Lars to run the command with `!`.',
  ].join(' ');
}

function main() {
  const reason = decide(JSON.parse(readFileSync(0, 'utf8')));

  if (reason) {
    process.stdout.write(
      JSON.stringify({
        hookSpecificOutput: { hookEventName: 'PreToolUse', permissionDecision: 'deny', permissionDecisionReason: reason },
      }),
    );
  }
}

if (process.argv[1]?.endsWith('oracle-guard.mjs')) {
  main();
}
