import type { CustomRuleDefinitionType, CustomRuleTypeDefinitions, RuleVisitor } from '@eslint/core';
import type { JSONLanguageOptions } from '@eslint/json';
import type { AnyNode } from '@humanwhocodes/momoa';

import type { FioriJSONSourceCode } from './source-code';

/**
 * Type definition for JSON-specific ESLint rules in Fiori context.
 * Used for rules that operate on manifest.json and other JSON configuration files.
 *
 * @template Options - Optional rule configuration type definitions
 */
export type FioriJSONRuleDefinition<Options extends Partial<CustomRuleTypeDefinitions> = {}> = CustomRuleDefinitionType<
    {
        LangOptions: JSONLanguageOptions;
        Code: FioriJSONSourceCode;
        Visitor: RuleVisitor;
        Node: AnyNode;
    },
    Options
>;
