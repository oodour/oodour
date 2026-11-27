// Loaded with --import into the test processes of the core's and the ESLint package's Stryker runs. It resolves `@oodour/core` to the core's
// source under the current directory, which in a Stryker run is the sandbox, so the ESLint package's tests load the
// mutated core. Through node_modules they would load the real one, since the workspace links the package there.
import { registerHooks, type RegisterHooksOptions } from 'node:module';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

type Resolve = NonNullable<RegisterHooksOptions['resolve']>;

/** `@oodour/core` from the core's source under `directory`; every other specifier as before. */
export function resolveCoreFrom(directory: string): Resolve {
  const core = pathToFileURL(join(directory, 'packages/core/src/index.ts')).href;

  return (specifier, context, nextResolve) =>
    specifier === '@oodour/core' ? { url: core, shortCircuit: true } : nextResolve(specifier, context);
}

registerHooks({ resolve: resolveCoreFrom(process.cwd()) });
