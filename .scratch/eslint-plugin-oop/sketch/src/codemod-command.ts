/**
 * The command a person runs for a codemod, as text. `create-rule.ts` puts it into rule messages and
 * `run-codemod.ts` into its usage output, so the two cannot drift apart. No imports: linting loads this module.
 *
 * Returns `npx oop-codemod <name> <file>:<line>`. The angle-bracket parts stay literal: the lint report prints
 * the file and line right beside the message.
 */
export function codemodCommand(codemodName: string): string {
  throw new Error(`not implemented: ${codemodName}`);
}
