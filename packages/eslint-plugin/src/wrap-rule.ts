import type { JSONSchema4 } from '@typescript-eslint/utils/json-schema';
import type { ReportDescriptor, RuleContext, RuleListener } from '@typescript-eslint/utils/ts-eslint';
import { createRequire } from 'node:module';
import { builtinRules } from 'eslint/use-at-your-own-risk';
import { createRule, type OopRuleDocs, type OopRuleModule, type Remedy } from './create-rule.ts';

/** The remedy of every size limit: a limit says where to look, and the cure is a split only a person can name. */
export const sizeRemedy: Remedy = {
  kind: 'none',
  because: 'which pieces to split out, and their names, are for a person to choose',
};

/** What a wrapper uses of the rule it wraps, in typescript-eslint's types whichever package the rule comes from. */
interface UpstreamRule {
  readonly meta: { readonly schema: JSONSchema4 | readonly JSONSchema4[] };
  readonly create: (context: Readonly<RuleContext<string, unknown[]>>) => RuleListener;
}

/** A rule to wrap: its ID, which the error names when it cannot be loaded, and its module as loaded, if it was. */
export interface WrappedRule {
  readonly id: string;
  readonly module: unknown;
}

/** An ESLint core rule, to hand to `wrapRule`. */
export function coreRule(name: string): WrappedRule {
  // eslint-disable-next-line @typescript-eslint/no-deprecated -- ESLint 10 has no other route to a core rule's module
  return { id: name, module: builtinRules.get(name) };
}

/** A rule of a plugin this package depends on, under the prefix its rule IDs take. */
export function pluginRule(prefix: string, rules: Readonly<Record<string, unknown>>, ruleName: string): WrappedRule {
  return { id: `${prefix}/${ruleName}`, module: rules[ruleName] };
}

const require = createRequire(import.meta.url);

/** A rule of a plugin package the consumer may not have installed, under the prefix its rule IDs take. */
export function optionalPluginRule(
  prefix: string,
  packageName: string,
  ruleName: string,
  load: (id: string) => unknown = require,
): WrappedRule {
  return { id: `${prefix}/${ruleName}`, module: loadedRule(packageName, ruleName, load) };
}

function loadedRule(packageName: string, ruleName: string, load: (id: string) => unknown): unknown {
  let plugin: unknown;

  try {
    plugin = load(packageName);
  } catch (error) {
    if (typeof error === 'object' && error !== null && 'code' in error && error.code === 'MODULE_NOT_FOUND') {
      return undefined;
    }

    throw error;
  }

  if (typeof plugin !== 'object' || plugin === null || !('rules' in plugin)) {
    return undefined;
  }

  const { rules }: { rules: unknown } = plugin;

  return typeof rules === 'object' && rules !== null && Object.hasOwn(rules, ruleName)
    ? Object.getOwnPropertyDescriptor(rules, ruleName)?.value
    : undefined;
}

export interface WrappedRuleDefinition<TOptions extends readonly unknown[]> {
  readonly name: string;
  /** The rule it wraps; its module is `undefined` when its package is not installed. */
  readonly upstream: WrappedRule;
  readonly docs: OopRuleDocs & { readonly description: string };
  readonly message: string;
  readonly defaultOptions: TOptions;
}

/**
 * An existing rule under a message of ours: it keeps the wrapped rule's checks, options schema and message data (such
 * as `{{max}}`), and gives every report the one message `found`. When the wrapped rule is missing, the wrapper
 * still loads, and throws only when a config turns it on.
 */
export function wrapRule<TOptions extends readonly unknown[]>(
  definition: WrappedRuleDefinition<TOptions>,
): OopRuleModule<'found', TOptions> {
  const { name, docs, message, defaultOptions } = definition;
  const { id: wraps, module } = definition.upstream;
  const upstream = isUpstreamRule(module) ? module : undefined;

  return createRule<TOptions, 'found'>({
    name,
    meta: {
      type: 'suggestion',
      docs,
      messages: { found: message },
      // Without the wrapped rule there is no schema to check options against; `create` throws before they matter.
      schema: upstream?.meta.schema ?? { type: 'array' },
      defaultOptions,
    },
    create(context, options) {
      if (upstream === undefined) {
        throw new Error(`@oodour/${name} wraps ${wraps}, which could not be loaded: install its plugin.`);
      }

      // ESLint freezes the context, so a Proxy may not change `options` or `report`; an object that inherits from the
      // context and shadows both may.
      const forwarding: unknown = Object.create(context, {
        options: { value: options },
        report: {
          value: (descriptor: ReportDescriptor<string>) => {
            context.report({ ...descriptor, messageId: 'found', suggest: null });
          },
        },
      });

      if (!isRuleContext(forwarding)) {
        // Stryker disable next-line StringLiteral: never thrown, as the forwarding object inherits from a rule context
        throw new Error('The forwarding context lost the rule context it inherits from.');
      }

      return upstream.create(forwarding);
    },
  });
}

function isUpstreamRule(value: unknown): value is UpstreamRule {
  return (
    typeof value === 'object' &&
    value !== null &&
    'create' in value &&
    typeof value.create === 'function' &&
    'meta' in value &&
    typeof value.meta === 'object' &&
    value.meta !== null &&
    'schema' in value.meta &&
    typeof value.meta.schema === 'object' &&
    value.meta.schema !== null
  );
}

function isRuleContext(value: unknown): value is Readonly<RuleContext<string, unknown[]>> {
  // Stryker disable ConditionalExpression: `true` holds for its one argument, which inherits from a rule context; `false` throws for every wrapped rule, which every wrapper test kills
  return (
    typeof value === 'object' &&
    value !== null &&
    'report' in value &&
    typeof value.report === 'function' &&
    'sourceCode' in value &&
    typeof value.sourceCode === 'object'
  );
  // Stryker restore ConditionalExpression
}
