import { featureEnvy } from '../../src/rules/feature-envy.ts';
import { testRuleWithTypes } from '../../src/testing/rule-testers.ts';

// Run as a file of its own by rule-testers.test.ts, which reads the suite's name from the report.
testRuleWithTypes(featureEnvy, { valid: ['const a = 1;'], invalid: [] });
