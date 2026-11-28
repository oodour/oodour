import packageJson from '../package.json' with { type: 'json' };
import { buildConfigs, pluginNamespace, type OopConfigs } from './presets.ts';
import { rules } from './rules/index.ts';

/** The public plugin type: wide like `OopConfig`, so ESLint's `Plugin` type and `defineConfig` accept it. */
export interface OOdourPlugin {
  readonly meta: {
    readonly name: string;
    readonly version: string;
    readonly namespace: string;
  };
  readonly configs: OopConfigs;
}

// The presets register this exact object, so it exists before they are built. `Object.assign` fills `configs` in
// place and keeps the identity: a consumer who also registers the default export by hand registers the same object.
const registered = {
  meta: {
    name: packageJson.name,
    version: packageJson.version,
    namespace: pluginNamespace,
  },
  rules,
  configs: {},
};

const plugin: OOdourPlugin = Object.assign(registered, {
  configs: buildConfigs(registered),
});

export default plugin;

// The plugin type leaves out `rules` so ESLint's `Plugin` type and `defineConfig` accept it; a consumer who needs the
// rule modules (a docs generator, a test of their own config) takes them from here, typed as typescript-eslint rules.
export { rules as oodourRules } from './rules/index.ts';
export type {
  OopRuleModule as OOdourRuleModule,
  OopRuleDocs as OOdourRuleDocs,
} from './create-rule.ts';
