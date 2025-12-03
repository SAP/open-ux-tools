import flexEnabledRule from './flex-enabled';
import type { Rule } from 'eslint';
import type { FioriMixedRuleDefinition, ManifestRuleDefinition } from '../types';
import type { FioriXMLRuleDefinition } from '../language/xml/types';
import requireFioriAnnotations from './require-fiori-annotations';
import requireWidthIncludingColumnHeader from './require-width-including-column-header';
import noUnresolvedAnnotationPaths from './no-unresolved-annotation-paths';

export const rules: Record<
    string,
    Rule.RuleModule | ManifestRuleDefinition | FioriMixedRuleDefinition | FioriXMLRuleDefinition
> = {
    'flex-enabled': flexEnabledRule,
    'require-fiori-annotations': requireFioriAnnotations,
    'require-width-including-column-header': requireWidthIncludingColumnHeader,
    'no-unresolved-annotation-paths': noUnresolvedAnnotationPaths
};
