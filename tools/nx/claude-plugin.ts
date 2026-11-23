import { cpSync, existsSync, globSync, readFileSync, rmSync } from 'node:fs';
import { dirname, join, posix, sep } from 'node:path';
import type { CreateNodes, TargetConfiguration } from '@nx/devkit';

function manifestName(workspaceRoot: string, manifest: string): string {
  const plugin: unknown = JSON.parse(readFileSync(join(workspaceRoot, manifest), 'utf8'));
  const name = typeof plugin === 'object' && plugin !== null && 'name' in plugin ? plugin.name : undefined;

  if (typeof name !== 'string') {
    throw new Error(`${manifest} names no plugin`);
  }

  return name;
}

function dependencyNames(workspaceRoot: string, root: string): string[] {
  const manifest = join(workspaceRoot, root, 'package.json');

  if (!existsSync(manifest)) {
    return [];
  }

  const plugin: unknown = JSON.parse(readFileSync(manifest, 'utf8'));
  const dependencies = typeof plugin === 'object' && plugin !== null && 'dependencies' in plugin ? plugin.dependencies : {};

  return typeof dependencies === 'object' && dependencies !== null ? Object.keys(dependencies) : [];
}

export const createNodes: CreateNodes = [
  'plugins/*/.claude-plugin/plugin.json',
  (manifests, _options, { workspaceRoot }) =>
    manifests.map((manifest) => {
      const root = dirname(dirname(manifest));
      const name = manifestName(workspaceRoot, manifest);
      const markdown = globSync('**/*.md', { cwd: join(workspaceRoot, root) })
        .map((file) => posix.join(root, file.replaceAll(sep, '/')))
        .sort();
      const exists = (folder: string): boolean => existsSync(join(workspaceRoot, folder));

      const targets = pluginTargets(root, name, markdown, exists, dependencyNames(workspaceRoot, root));

      return [manifest, { projects: { [root]: { name, targets } } }] as const;
    }),
];

export function assemble(plugin: string, evals: string, out: string): void {
  const results = join(evals, 'results');

  rmSync(out, { recursive: true, force: true });
  cpSync(plugin, out, { recursive: true });
  cpSync(evals, join(out, 'evals'), {
    recursive: true,
    // A folder the filter refuses is not entered, so its files need no check of their own.
    filter: (source) => source !== results,
  });
}

// `claude plugin eval` reads cases only below the plugin root, and the cases stay out of the distributed plugin.
function assembleTarget(root: string, evals: string, assembled: string): TargetConfiguration {
  return {
    command: `node tools/nx/claude-plugin.ts assemble ${root} ${evals} ${assembled}`,
    cache: true,
    inputs: [
      'default',
      `{workspaceRoot}/${evals}/**/*`,
      `!{workspaceRoot}/${evals}/results/**/*`,
      '{workspaceRoot}/tools/nx/claude-plugin.ts',
    ],
    outputs: [`{workspaceRoot}/${assembled}`],
  };
}

function scriptTargets(scripts: string, dependencies: readonly string[]): Record<string, TargetConfiguration> {
  const packages = { externalDependencies: [...dependencies] };

  return {
    typecheck: {
      command: `tsc -p ${scripts}/tsconfig.json`,
      inputs: ['default', { externalDependencies: [...dependencies, '@types/node'] }],
    },
    lint: { command: `eslint ${scripts}` },
    test: {
      command: `node --test "${scripts}/*.test.ts"`,
      cache: true,
      inputs: ['default', packages, { runtime: 'node --version' }],
      outputs: [],
    },
  };
}

export function pluginTargets(
  root: string,
  name: string,
  markdown: readonly string[],
  exists: (folder: string) => boolean,
  dependencies: readonly string[],
): Record<string, TargetConfiguration> {
  const evals = `evals/${name}`;
  const assembled = `dist/eval/${name}`;
  const evalFolders = [evals, `${evals}-real`].filter(exists);
  const scripts = `${root}/scripts`;

  return {
    ...(exists(scripts) ? scriptTargets(scripts, dependencies) : {}),
    'pre-eval': assembleTarget(root, evals, assembled),
    'pre-eval-real': assembleTarget(root, `${evals}-real`, `${assembled}-real`),
    eval: {
      command: `claude plugin eval ${assembled}`,
      dependsOn: ['pre-eval'],
      cache: false,
    },
    // Real-repository cases unpack a pinned commit with a scaffold script, which runs only under --scaffold.
    'eval-real': {
      command: `claude plugin eval ${assembled}-real --scaffold`,
      dependsOn: ['pre-eval-real'],
      cache: false,
    },
    validate: {
      command: `claude plugin validate --strict ${root}`,
      cache: true,
      inputs: ['default', { runtime: 'claude --version' }],
      outputs: [],
    },
    // The store is git-ignored, so Nx cannot hash it: a cached pass could hide a source added since.
    // Each eval folder that exists goes in whole: listing its files would pass the Windows command-line limit.
    overlap: {
      command: ['node tools/source-overlap.ts --min-words 6', ...markdown, ...evalFolders].join(' '),
      cache: false,
    },
    citations: {
      command: ['node tools/citations.ts', ...markdown].join(' '),
      cache: true,
      inputs: ['default', '{workspaceRoot}/tools/citations.ts'],
      outputs: [],
    },
  };
}

if (import.meta.main) {
  const [command, plugin, evals, out, ...rest] = process.argv.slice(2);

  if (command !== 'assemble' || plugin === undefined || evals === undefined || out === undefined || rest.length > 0) {
    console.error('usage: node tools/nx/claude-plugin.ts assemble <plugin> <evals> <out>');
    process.exitCode = 2;
  } else {
    assemble(plugin, evals, out);
  }
}
