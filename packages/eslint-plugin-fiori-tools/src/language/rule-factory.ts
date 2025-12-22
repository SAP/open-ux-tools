import type { RuleContext, RulesMeta, RuleVisitor } from '@eslint/core';
import type { FioriLanguageOptions, FioriSourceCode, Node } from './fiori-language';
import { JSONSourceCode } from '@eslint/json';
import type { FioriJSONSourceCode } from './json/source-code';
import type { AnyNode } from '@humanwhocodes/momoa';
import { FioriXMLSourceCode } from './xml/source-code';
import type { XMLAstNode, XMLToken } from '@xml-tools/ast';
import type { FioriRuleDefinition } from '../types';
import { FioriAnnotationSourceCode } from './annotations/source-code';
import type { AnyNode as AnyAnnotationNode } from '@sap-ux/odata-annotation-core';
import { DiagnosticCache } from './diagnostic-cache';
import type { Diagnostic } from './diagnostics';

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

/**
 * Creates a Fiori rule that can operate on multiple files in a Fiori application.
 *
 * @param param0 - Rule definition.
 * @param param0.ruleId
 * @param param0.meta
 * @param param0.createJson
 * @param param0.createXml
 * @param param0.createAnnotations
 * @param param0.check
 * @returns A Fiori rule definition.
 */
export function createFioriRule<
    MessageIds extends string,
    RuleOptions extends unknown[],
    ExtRuleDocs extends Record<string, unknown> = {},
    T extends Diagnostic['type'] = Diagnostic['type']
>({
    ruleId,
    meta,
    check,
    createJson,
    createXml,
    createAnnotations
}: {
    ruleId: T;
    meta?: RulesMeta<MessageIds, RuleOptions, ExtRuleDocs>;
    createJson?: (
        context: JSONRuleContext<MessageIds, RuleOptions>,
        validationResult: Extract<Diagnostic, { type: T }>[]
    ) => RuleVisitor;
    createXml?: (
        context: XMLRuleContext<MessageIds, RuleOptions>,
        validationResult: Extract<Diagnostic, { type: T }>[]
    ) => RuleVisitor;
    createAnnotations?: (
        context: AnnotationRuleContext<MessageIds, RuleOptions>,
        validationResult: Extract<Diagnostic, { type: T }>[]
    ) => RuleVisitor;
    check: (
        context: RuleContext<{
            LangOptions: FioriLanguageOptions;
            Code: FioriSourceCode;
            RuleOptions: RuleOptions;
            Node: Node;
            MessageIds: MessageIds;
        }>
    ) => Extract<Diagnostic, { type: T }>[];
}): FioriRuleDefinition<{ MessageIds: MessageIds; RuleOptions: RuleOptions }> {
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
            if (!cachedDiagnostics) {
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
