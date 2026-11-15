// Holds an oracle agent's report back while it shares a verbatim run of six or more words with
// the sealed store, and sends the agent back to rewrite it in its own words, so the copy never
// reaches the driver's context. Rules: AGENTS.md, "Oracle firewall".
//
// Two delivery paths, two events. A subagent that reports through the SubagentHandback tool is
// gated at PreToolUse on that tool, by denying the call; SubagentStop then carries no
// last_assistant_message (measured 2026-11-15). A subagent that reports through its last message
// is gated at SubagentStop, by blocking the stop.

import { readFileSync } from 'node:fs';
import { basename } from 'node:path';
import { type Corpus, describeRuns, findRuns, handBackMinWords, loadCorpus } from '../../tools/source-overlap.ts';
import { denyOutput, type HookInput, isRecord, readHookInput, stringField } from './hook-input.ts';

const gated: ReadonlySet<string> = new Set(['oracle', 'oracle-reviewer', 'oracle-curator']);

function textBlocks(content: unknown): string {
  if (typeof content === 'string') {
    return content;
  }

  if (!Array.isArray(content)) {
    return '';
  }

  return content
    .flatMap((block: unknown) => (isRecord(block) && block['type'] === 'text' ? [stringField(block, 'text') ?? ''] : []))
    .join('\n');
}

// Undefined for a line that is not JSON, such as a half-written last line.
function parseLine(line: string): unknown {
  try {
    return JSON.parse(line);
  } catch {
    return undefined;
  }
}

// Claude Code can write one message's content blocks as several records that share its id.
export function lastAssistantText(transcript: string): string {
  const records = transcript.trim().split('\n').map(parseLine);
  const messages = records.flatMap((record) =>
    isRecord(record) && record['type'] === 'assistant' ? [isRecord(record['message']) ? record['message'] : {}] : [],
  );
  const last = messages.at(-1);

  if (last === undefined && records.includes(undefined)) {
    throw new Error('the transcript could not be parsed');
  }

  if (last === undefined) {
    return '';
  }

  const id = last['id'];
  const trailing = id === undefined ? [last] : messages.slice(messages.findLastIndex((message) => message['id'] !== id) + 1);

  return trailing.map((message) => textBlocks(message['content'])).join('\n');
}

function report(input: HookInput): string {
  if (input.hookEventName === 'PreToolUse') {
    return input.toolName === 'SubagentHandback' ? (stringField(input.toolInput, 'message') ?? '') : '';
  }

  if (input.lastAssistantMessage !== undefined && input.lastAssistantMessage !== '') {
    return input.lastAssistantMessage;
  }

  return input.agentTranscriptPath === undefined ? '' : lastAssistantText(readFileSync(input.agentTranscriptPath, 'utf8'));
}

export function review(input: HookInput, corpus?: Corpus): string | undefined {
  if (!gated.has(input.agentType ?? '')) {
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

  return [
    `oracle-hand-back: your report shares ${String(runs.length)} verbatim run(s) of ${String(handBackMinWords)}+ words with the store,`,
    `at ${describeRuns(runs).join('; ')} (word positions in your report). Nothing was delivered.`,
    'Rewrite each listed passage in your own words and send the whole report again. Names of works, principles and patterns are fine; the wording around them is not.',
    input.stopHookActive
      ? 'You were already sent back once: replace each listed passage with "[withheld: source wording]".'
      : 'If a passage cannot be said differently, replace it with "[withheld: source wording]".',
  ].join(' ');
}

export function output(input: HookInput, reason: string): string {
  return input.hookEventName === 'PreToolUse' ? denyOutput(reason) : JSON.stringify({ decision: 'block', reason });
}

// At PreToolUse a failed gate denies the hand-back, so nothing unchecked is delivered. At
// SubagentStop it blocks the first stop, and lets the second through with a warning on stderr:
// blocking every stop it cannot judge would hold the agent in a loop.
export function run(read: () => HookInput, write: (output: string) => void, warn: (message: string) => void): void {
  let input: HookInput | undefined;

  try {
    input = read();
    const reason = review(input);

    if (reason !== undefined) {
      write(output(input, reason));
    }
  } catch (error) {
    const message = `oracle-hand-back: the gate failed (${error instanceof Error ? error.message : String(error)}).`;

    if (input?.hookEventName === 'SubagentStop' && !input.stopHookActive) {
      write(output(input, `${message} Your report was not checked. Send it again as your last message.`));
    } else if (input?.hookEventName === 'SubagentStop') {
      warn(message);
    } else {
      write(denyOutput(`${message} Nothing was delivered; tell the driver the gate failed.`));
    }
  }
}

if (process.argv[1] !== undefined && basename(process.argv[1]) === 'oracle-hand-back.ts') {
  run(
    readHookInput,
    (text) => process.stdout.write(text),
    (message) => process.stderr.write(`${message}\n`),
  );
}
