import { readFileSync } from 'node:fs';

export type TrustDecision = 'ask' | undefined;

function fieldOf(value: unknown, name: string): unknown {
  return typeof value === 'object' && value !== null ? Object.entries(value).find(([key]) => key === name)?.[1] : undefined;
}

// The plugin's own script, then the command name as the first argument: the CLI reads trust only from the first one.
// Only plain argument characters may follow: Bash and PowerShell each have characters that start a second command.
const untrustedForm =
  /^[ \t]*node[ \t]+(?:"(?<quoted>[^"]+)"|(?<bare>[^\s"]+))[ \t]+hotspots(?:[ \t][\p{L}\p{N} \t"'/\\:._~=+@-]*)?$/u;

const withSlashes = (path: string): string => path.replaceAll('\\', '/');

function isUntrustedForm(command: string, pluginRoot: string): boolean {
  const script = untrustedForm.exec(command)?.groups;
  const path = script?.['quoted'] ?? script?.['bare'];

  return path !== undefined && withSlashes(path) === `${withSlashes(pluginRoot)}/scripts/lz-oop.ts`;
}

function parsedOrUndefined(input: string): unknown {
  try {
    return JSON.parse(input);
  } catch {
    return undefined;
  }
}

export function trustDecision(input: string, pluginRoot: string): TrustDecision {
  const parsed = parsedOrUndefined(input);

  if (parsed === undefined) {
    return 'ask';
  }

  const command = fieldOf(fieldOf(parsed, 'tool_input'), 'command');

  if (fieldOf(parsed, 'permission_mode') !== 'auto' || (typeof command === 'string' && isUntrustedForm(command, pluginRoot))) {
    return undefined;
  }

  return 'ask';
}

if (import.meta.main) {
  const { CLAUDE_PLUGIN_ROOT: pluginRoot = '' } = process.env;

  // The hook never allows: it asks for a trusted call in auto mode, and otherwise leaves the decision to the settings.
  if (trustDecision(readFileSync(0, 'utf8'), pluginRoot) === 'ask') {
    process.stdout.write(
      JSON.stringify({
        hookSpecificOutput: {
          hookEventName: 'PreToolUse',
          permissionDecision: 'ask',
          permissionDecisionReason:
            'lz-oop: a trusted audit lets Git, tests and linters start programs this repository names; allow it only if you trust the repository.',
        },
      }),
    );
  }
}
