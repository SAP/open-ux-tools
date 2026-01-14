import type { CustomRuleDefinitionType, CustomRuleTypeDefinitions, RuleVisitor } from '@eslint/core';

import type { FioriAnnotationSourceCode } from './source-code';
import type { AnyNode } from '@sap-ux/odata-annotation-core';

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
