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
import { DiagnosticCache } from './diagnostic-cache';
import { Diagnostic } from './diagnostics';

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
    ExtRuleDocs extends Record<string, unknown> = {}
>({
    ruleId,
    meta,
    check,
    createJson,
    createXml,
    createAnnotations
}: {
    ruleId: Diagnostic['type'];
    meta?: RulesMeta<MessageIds, RuleOptions, ExtRuleDocs>;
    createJson?: (
        context: JSONRuleContext<MessageIds, RuleOptions>,
        validationResult: Extract<Diagnostic, { type: typeof ruleId }>[]
    ) => RuleVisitor;
    createXml?: (
        context: XMLRuleContext<MessageIds, RuleOptions>,
        validationResult: Extract<Diagnostic, { type: typeof ruleId }>[]
    ) => RuleVisitor;
    createAnnotations?: (
        context: AnnotationRuleContext<MessageIds, RuleOptions>,
        validationResult: Extract<Diagnostic, { type: typeof ruleId }>[]
    ) => RuleVisitor;
    check: (
        context: RuleContext<{
            LangOptions: FioriLanguageOptions;
            Code: FioriSourceCode;
            RuleOptions: RuleOptions;
            Node: Node;
            MessageIds: MessageIds;
        }>
    ) => Extract<Diagnostic, { type: typeof ruleId }>[];
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
            let cachedDiagnostics = DiagnosticCache.getMessages(ruleId);
            if (cachedDiagnostics) {
                console.log('Using cached diagnostics for rule', ruleId);
            } else {
                console.log('Computing diagnostics for rule', ruleId);
                cachedDiagnostics = check(context);
                DiagnosticCache.addMessages(ruleId, cachedDiagnostics);
            }
            if (context.sourceCode instanceof JSONSourceCode && createJson) {
                return createJson(context as JSONRuleContext<MessageIds, RuleOptions>, cachedDiagnostics);
            }
            if (context.sourceCode instanceof FioriXMLSourceCode && createXml) {
                return createXml(context as XMLRuleContext<MessageIds, RuleOptions>, cachedDiagnostics);
            }
            if (context.sourceCode instanceof FioriAnnotationSourceCode && createAnnotations) {
                return createAnnotations(context as AnnotationRuleContext<MessageIds, RuleOptions>, cachedDiagnostics);
            }
            return {};
        }
    };
}
