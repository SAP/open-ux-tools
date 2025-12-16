import flexEnabledRule from './sap-require-flex-enabled';
import type { Rule } from 'eslint';
import type { FioriRuleDefinition, ManifestRuleDefinition } from '../types';
import type { FioriXMLRuleDefinition } from '../language/xml/types';
import requireWidthIncludingColumnHeader from './sap-require-width-including-column-header';
import { REQUIRE_FLEX_ENABLED, REQUIRE_WIDTH_INCLUDING_COLUMN_HEADER_RULE_TYPE } from '../language/diagnostics';

export const rules: Record<
    string,
    Rule.RuleModule | ManifestRuleDefinition | FioriRuleDefinition | FioriXMLRuleDefinition
> = {
    [REQUIRE_FLEX_ENABLED]: flexEnabledRule,
    [REQUIRE_WIDTH_INCLUDING_COLUMN_HEADER_RULE_TYPE]: requireWidthIncludingColumnHeader
};
