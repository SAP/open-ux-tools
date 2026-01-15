import type { CustomRuleDefinitionType, CustomRuleTypeDefinitions, RuleVisitor } from '@eslint/core';
import type { JSONLanguageOptions } from '@eslint/json';
import type { AnyNode } from '@humanwhocodes/momoa';

import type { FioriJSONSourceCode } from './source-code';

export type FioriJSONRuleDefinition<Options extends Partial<CustomRuleTypeDefinitions> = {}> = CustomRuleDefinitionType<
    {
        LangOptions: JSONLanguageOptions;
        Code: FioriJSONSourceCode;
        Visitor: RuleVisitor;
        Node: AnyNode;
    },
    Options
>;
