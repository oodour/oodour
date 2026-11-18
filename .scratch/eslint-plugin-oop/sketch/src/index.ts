import packageJson from '../package.json' with { type: 'json' };
import { buildConfigs, pluginNamespace, type OopConfigs, type RegisteredPlugin } from './presets.ts';
import { rules } from './rules/index.ts';

export interface OopPlugin extends RegisteredPlugin {
  readonly configs: OopConfigs;
}

// The presets register this exact object under `pluginNamespace`, so it has to exist before they are built.
// `Object.assign` fills `configs` in place and keeps the identity: a consumer who also registers the default export
// by hand registers the same object, and ESLint only objects to two different ones under one key.
const registered = {
  meta: { name: packageJson.name, version: packageJson.version, namespace: pluginNamespace },
  rules,
  configs: {},
};

const plugin: OopPlugin = Object.assign(registered, { configs: buildConfigs(registered) });

export default plugin;
