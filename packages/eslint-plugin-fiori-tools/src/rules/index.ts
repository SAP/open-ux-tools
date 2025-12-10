import flexEnabledRule from './flex-enabled';
import type { Rule } from 'eslint';
import type { FioriMixedRuleDefinition, ManifestRuleDefinition } from '../types';
import type { FioriXMLRuleDefinition } from '../language/xml/types';
import requireWidthIncludingColumnHeader from './require-width-including-column-header';
import { REQUIRE_WIDTH_INCLUDING_COLUMN_HEADER_RULE_TYPE } from '../language/diagnostics';

export const rules: Record<
    string,
    Rule.RuleModule | ManifestRuleDefinition | FioriMixedRuleDefinition | FioriXMLRuleDefinition
> = {
    'flex-enabled': flexEnabledRule,
    [REQUIRE_WIDTH_INCLUDING_COLUMN_HEADER_RULE_TYPE]: requireWidthIncludingColumnHeader
};
