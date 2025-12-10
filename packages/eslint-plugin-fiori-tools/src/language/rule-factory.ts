import type { RuleContext, RulesMeta, RuleVisitor } from '@eslint/core';
import type { FioriLanguageOptions, FioriSourceCode, Node } from './fiori-language';
import { JSONSourceCode } from '@eslint/json';
import type { FioriJSONSourceCode } from './json/source-code';
import type { AnyNode } from '@humanwhocodes/momoa';
import { FioriXMLSourceCode } from './xml/source-code';
import type { XMLAstNode, XMLToken } from '@xml-tools/ast';
import { FioriMixedRuleDefinition } from '../types';
import { FioriAnnotationSourceCode } from './annotations/source-code';
import { AnyNode as AnyAnnotationNode } from '@sap-ux/odata-annotation-core';

type FioriRuleLanguageSpecificOptions = {
    LangOptions: FioriLanguageOptions;
    Code: FioriSourceCode;
    Visitor: RuleVisitor;
    Node: Node;
};

type JSONRuleContext<MessageIds extends string, RuleOptions extends unknown[]> = RuleContext<{
    LangOptions: FioriLanguageOptions;
    Code: FioriJSONSourceCode;
    RuleOptions: RuleOptions;
    Node: AnyNode;
    MessageIds: MessageIds;
}>;
type XMLRuleContext<MessageIds extends string, RuleOptions extends unknown[]> = RuleContext<{
    LangOptions: FioriLanguageOptions;
    Code: FioriXMLSourceCode;
    RuleOptions: RuleOptions;
    Node: XMLAstNode | XMLToken;
    MessageIds: MessageIds;
}>;

type AnnotationRuleContext<MessageIds extends string, RuleOptions extends unknown[]> = RuleContext<{
    LangOptions: FioriLanguageOptions;
    Code: FioriAnnotationSourceCode;
    RuleOptions: RuleOptions;
    Node: AnyAnnotationNode;
    MessageIds: MessageIds;
}>;

export function createMixedRule<
    MessageIds extends string,
    RuleOptions extends unknown[],
    ValidationResult,
    ExtRuleDocs extends Record<string, unknown> = {}
>({
    meta,
    check,
    createJson,
    createXml,
    createAnnotations
}: {
    meta?: RulesMeta<MessageIds, RuleOptions, ExtRuleDocs>;
    createJson?: (context: JSONRuleContext<MessageIds, RuleOptions>, validationResult: ValidationResult) => RuleVisitor;
    createXml?: (context: XMLRuleContext<MessageIds, RuleOptions>, validationResult: ValidationResult) => RuleVisitor;
    createAnnotations?: (
        context: AnnotationRuleContext<MessageIds, RuleOptions>,
        validationResult: ValidationResult
    ) => RuleVisitor;
    check: (
        context: RuleContext<{
            LangOptions: FioriLanguageOptions;
            Code: FioriSourceCode;
            RuleOptions: RuleOptions;
            Node: Node;
            MessageIds: MessageIds;
        }>
    ) => ValidationResult;
}): FioriMixedRuleDefinition<{ MessageIds: MessageIds; RuleOptions: RuleOptions }> {
    return {
        meta,
        create(
            context: RuleContext<{
                LangOptions: FioriLanguageOptions;
                Code: FioriSourceCode;
                RuleOptions: RuleOptions;
                Node: Node;
                MessageIds: MessageIds;
            }>
        ): RuleVisitor {
            const validationResult = check(context);
            if (context.sourceCode instanceof JSONSourceCode && createJson) {
                return createJson(context as JSONRuleContext<MessageIds, RuleOptions>, validationResult);
            }
            if (context.sourceCode instanceof FioriXMLSourceCode && createXml) {
                return createXml(context as XMLRuleContext<MessageIds, RuleOptions>, validationResult);
            }
            if (context.sourceCode instanceof FioriAnnotationSourceCode && createAnnotations) {
                return createAnnotations(context as AnnotationRuleContext<MessageIds, RuleOptions>, validationResult);
            }
            return {};
        }
    };
}
