import type { RuleVisitor } from '@eslint/core';
import type { CustomRuleDefinitionType, CustomRuleTypeDefinitions } from '@eslint/plugin-kit';

import type { I18nNode, FioriI18nSourceCode } from './source-code.js';

/**
 * Type definition for i18n .properties-specific ESLint rules in Fiori context.
 * Used for rules that operate on i18n resource bundle files.
 *
 * @template Options - Optional rule configuration type definitions
 */
export type FioriI18nRuleDefinition<Options extends Partial<CustomRuleTypeDefinitions> = {}> = CustomRuleDefinitionType<
    {
        LangOptions: {};
        Code: FioriI18nSourceCode;
        Visitor: RuleVisitor;
        Node: I18nNode;
    },
    Options
>;
