/**
 * Compares a folder of one-module-per-file sources with the registry that lists them. Used for `rules/` and
 * `codemods/`: both have an `index.ts` an author can forget to extend, and both hold nothing but such modules.
 *
 * A module file is every `<name>.ts` in the folder except `index.ts` and `*.test.ts`.
 * Returns one line per problem, empty when the folder and the registry agree:
 * - `<name>.ts is not registered`
 * - `<name> is registered but has no file`
 * - `<name>.ts has no <name>.test.ts`
 */
export function modulesMissingFromRegistry(folder: URL, registeredNames: readonly string[]): readonly string[] {
  throw new Error(`not implemented: ${folder.href} ${String(registeredNames.length)}`);
}
