import type { Codemod } from '../codemod.ts';

/**
 * Hide Delegate, for a chain `a.b.c` reported by `type-hopping-chain`: adds a method to the class of `a` that
 * returns `this.b.c`, and replaces the chain at the target with a call to it.
 *
 * The shape of every codemod module: one named export, in a file named after the codemod, with
 * `<codemod-name>.test.ts` beside it and one line in `codemods/index.ts`.
 */
export const hideDelegate: Codemod = {
  summary: 'Give the nearest object a method for what the chain reaches for, and call that method instead.',
  apply(project, target) {
    // TODO
    // 1. Find the outermost member chain at target. None: refuse.
    // 2. Resolve the declaration of the first receiver's type. Not a class in this project: refuse.
    // 3. The method name is taken: refuse. A person picks the name then.
    // 4. Add the method to that class, replace the chain with the call.
    // 5. Return the changed files, sorted.
    throw new Error(`not implemented: ${target.file} ${String(project.getSourceFiles().length)}`);
  },
};
