import flexEnabledRule from './flex-enabled';
import type { Rule } from 'eslint';
import type { FioriMixedRuleDefinition, ManifestRuleDefinition } from '../types';
import type { FioriXMLRuleDefinition } from '../language/xml/types';
import requireWidthIncludingColumnHeader from './require-width-including-column-header';

export const rules: Record<
    string,
    Rule.RuleModule | ManifestRuleDefinition | FioriMixedRuleDefinition | FioriXMLRuleDefinition
> = {
    'flex-enabled': flexEnabledRule,
    'require-width-including-column-header': requireWidthIncludingColumnHeader
};
