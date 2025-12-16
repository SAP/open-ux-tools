import type { CustomRuleDefinitionType, CustomRuleTypeDefinitions, RuleVisitor } from '@eslint/core';
import type { AnyNode } from '@humanwhocodes/momoa';
import type { JSONLanguageOptions, JSONSourceCode } from '@eslint/json';
import type { FioriJSONSourceCode } from './language/json/source-code';
import type { FioriXMLSourceCode } from './language/xml/source-code';
import type { XMLToken, XMLAstNode } from '@xml-tools/ast';
import type { AnyNode as AnyAnnotationNode } from '@sap-ux/odata-annotation-core';

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

export type FioriRuleDefinition<Options extends Partial<CustomRuleTypeDefinitions> = object> = CustomRuleDefinitionType<
    {
        LangOptions: JSONLanguageOptions;
        Code: FioriJSONSourceCode | FioriXMLSourceCode;
        Visitor: RuleVisitor;
        Node: AnyNode | XMLAstNode | XMLToken | AnyAnnotationNode;
    },
    Options
>;
