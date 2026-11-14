#!/usr/bin/env node
// SubagentStop: holds an oracle agent's answer back while it shares a verbatim run of six or
// more words with the sealed store, and sends the agent back to rewrite it in its own words.
// The answer reaches the driver's context only once it passes. Rules: AGENTS.md, "Oracle firewall".

import { readFileSync } from 'node:fs';
import { describeRuns, findRuns, handBackMinWords, loadCorpus } from '../../tools/source-overlap.mjs';

const gated = new Set(['oracle', 'oracle-reviewer', 'oracle-curator']);

function lastAssistantText(transcriptPath) {
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

export function review(input, corpus = loadCorpus(handBackMinWords)) {
  if (!gated.has(input.agent_type)) {
    return undefined;
  }

  const answer = input.last_assistant_message ?? lastAssistantText(input.agent_transcript_path);
  const runs = findRuns(answer, corpus);

  if (runs.length === 0) {
    return undefined;
  }

  const where = describeRuns(runs).join('; ');
  const repair = input.stop_hook_active
    ? 'You were already sent back once. Replace each listed passage with "[withheld: source wording]" and restate only what you can say in your own words.'
    : 'Rewrite each listed passage in your own words, then give your whole answer again. Names of works, principles and patterns are fine; the wording around them is not.';

  return `oracle-hand-back: your answer shares ${runs.length} verbatim run(s) of ${handBackMinWords}+ words with the store, at ${where} (word positions in your answer). ${repair}`;
}

function main() {
  const reason = review(JSON.parse(readFileSync(0, 'utf8')));

  if (reason) {
    process.stdout.write(JSON.stringify({ decision: 'block', reason }));
  }
}

if (process.argv[1]?.endsWith('oracle-hand-back.mjs')) {
  main();
}
