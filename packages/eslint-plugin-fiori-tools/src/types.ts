import type { CustomRuleDefinitionType, CustomRuleTypeDefinitions, RuleVisitor } from '@eslint/core';
import type { AnyNode } from '@humanwhocodes/momoa';
import type { JSONLanguageOptions, JSONSourceCode } from '@eslint/json';

export type ManifestRuleDefinition<Options extends Partial<CustomRuleTypeDefinitions> = Record<string, any>> =
    CustomRuleDefinitionType<
        {
            LangOptions: JSONLanguageOptions;
            Code: JSONSourceCode;
            Visitor: RuleVisitor;
            Node: AnyNode;
        },
        Options
    >;
