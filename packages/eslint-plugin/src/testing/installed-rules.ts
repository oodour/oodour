import eslintCommentsPlugin from '@eslint-community/eslint-plugin-eslint-comments';
import tseslintPlugin from '@typescript-eslint/eslint-plugin';
import type { Rule } from 'eslint';
import { builtinRules } from 'eslint/use-at-your-own-risk';
import functional from 'eslint-plugin-functional';
import sonarjs from 'eslint-plugin-sonarjs';
import unicorn from 'eslint-plugin-unicorn';
import type { CatalogRow, SourceId } from '../existing-rules.ts';

// The only module that imports the optional plugins. A catalog source without a loader here does not compile.
const ruleTables: Record<SourceId, Readonly<Record<string, unknown>>> = {
  // eslint-disable-next-line @typescript-eslint/no-deprecated -- ESLint 10 has no other route to a core rule's module, which RuleTester needs
  core: Object.fromEntries(builtinRules),
  '@typescript-eslint': tseslintPlugin.rules,
  '@eslint-community/eslint-comments': eslintCommentsPlugin.rules,
  unicorn: unicorn.rules ?? {},
  sonarjs: sonarjs.rules,
  functional: functional.rules,
};

/** The installed rule a catalog row names, or `undefined` when the installed package has no such rule. */
export function installedRule({ source, name }: Pick<CatalogRow, 'source' | 'name'>): Rule.RuleModule | undefined {
  const rule = Object.hasOwn(ruleTables[source], name) ? ruleTables[source][name] : undefined;

  return isRuleModule(rule) ? rule : undefined;
}

/** Narrows a rule module from any package, this plugin's own included, to ESLint's rule type. */
export function isRuleModule(value: unknown): value is Rule.RuleModule {
  return typeof value === 'object' && value !== null && 'create' in value && typeof value.create === 'function';
}
