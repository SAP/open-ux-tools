import flexEnabledRule from './flex-enabled';
import type { Rule } from 'eslint';
import type { ManifestRuleDefinition } from '../types';

export const rules: Record<string, Rule.RuleModule | ManifestRuleDefinition> = {
    'flex-enabled': flexEnabledRule
};
