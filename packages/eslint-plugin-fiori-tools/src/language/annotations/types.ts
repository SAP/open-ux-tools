import type { CustomRuleDefinitionType, CustomRuleTypeDefinitions, RuleVisitor } from '@eslint/core';

import type { FioriAnnotationSourceCode } from './source-code';
import type { AnyNode } from '@sap-ux/odata-annotation-core';

/**
 * Type definition for annotation-specific ESLint rules.
 * Used for rules that operate on OData annotation files (XML or CDS).
 *
 * @template Options - Optional rule configuration type definitions
 */
export type FioriAnnotationRuleDefinition<Options extends Partial<CustomRuleTypeDefinitions> = {}> =
    CustomRuleDefinitionType<
        {
            LangOptions: {};
            Code: FioriAnnotationSourceCode;
            Visitor: RuleVisitor;
            Node: AnyNode;
        },
        Options
    >;
