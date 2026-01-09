import type { CustomRuleDefinitionType, CustomRuleTypeDefinitions, RuleVisitor } from '@eslint/core';
import type { XMLAstNode, XMLToken } from '@xml-tools/ast';

import type { FioriXMLSourceCode } from './source-code';

export type FioriXMLRuleDefinition<Options extends Partial<CustomRuleTypeDefinitions> = {}> = CustomRuleDefinitionType<
    {
        LangOptions: {};
        Code: FioriXMLSourceCode;
        Visitor: RuleVisitor;
        Node: XMLAstNode | XMLToken;
    },
    Options
>;
