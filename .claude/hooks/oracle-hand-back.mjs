#!/usr/bin/env node
// Holds an oracle agent's report back while it shares a verbatim run of six or more words with
// the sealed store, and sends the agent back to rewrite it in its own words, so the copy never
// reaches the driver's context. Rules: AGENTS.md, "Oracle firewall".
//
// Two delivery paths, two events. A subagent that reports through the SubagentHandback tool is
// gated at PreToolUse on that tool, by denying the call; SubagentStop then carries no
// last_assistant_message (measured 2026-11-15). A subagent that reports through its last message
// is gated at SubagentStop, by blocking the stop.

import { readFileSync } from 'node:fs';
import { describeRuns, findRuns, handBackMinWords, loadCorpus } from '../../tools/source-overlap.mjs';

const gated = new Set(['oracle', 'oracle-reviewer', 'oracle-curator']);

function lastAssistantText(transcriptPath) {
  if (!transcriptPath) {
    return '';
  }

  const lines = readFileSync(transcriptPath, 'utf8').trim().split('\n').reverse();

  for (const line of lines) {
    const record = JSON.parse(line);

    if (record.type === 'assistant') {
      const content = record.message?.content ?? [];

      return typeof content === 'string'
        ? content
        : content.filter((block) => block.type === 'text').map((block) => block.text).join('\n');
    }
  }

  return '';
}

function report(input) {
  if (input.hook_event_name === 'PreToolUse') {
    return input.tool_name === 'SubagentHandback' ? (input.tool_input?.message ?? '') : '';
  }

  return input.last_assistant_message ?? lastAssistantText(input.agent_transcript_path);
}

export function review(input, corpus) {
  if (!gated.has(input.agent_type)) {
    return undefined;
  }

  const text = report(input);

  if (text === '') {
    return undefined;
  }

  const runs = findRuns(text, corpus ?? loadCorpus(handBackMinWords));

  if (runs.length === 0) {
    return undefined;
  }

  const where = describeRuns(runs).join('; ');

  return [
    `oracle-hand-back: your report shares ${runs.length} verbatim run(s) of ${handBackMinWords}+ words with the store,`,
    `at ${where} (word positions in your report). Nothing was delivered.`,
    'Rewrite each listed passage in your own words and send the whole report again. Names of works, principles and patterns are fine; the wording around them is not.',
    input.stop_hook_active
      ? 'You were already sent back once: replace each listed passage with "[withheld: source wording]".'
      : 'If a passage cannot be said differently, replace it with "[withheld: source wording]".',
  ].join(' ');
}

function main() {
  const input = JSON.parse(readFileSync(0, 'utf8'));
  const reason = review(input);

  if (!reason) {
    return;
  }

  const output =
    input.hook_event_name === 'PreToolUse'
      ? { hookSpecificOutput: { hookEventName: 'PreToolUse', permissionDecision: 'deny', permissionDecisionReason: reason } }
      : { decision: 'block', reason };

  process.stdout.write(JSON.stringify(output));
}

if (process.argv[1]?.endsWith('oracle-hand-back.mjs')) {
  main();
}
