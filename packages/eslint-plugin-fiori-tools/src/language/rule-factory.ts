import type { RuleContext, RulesMeta, RuleVisitor } from '@eslint/core';
import type { FioriLanguageOptions, FioriSourceCode, Node } from './fiori-language';
import { JSONSourceCode } from '@eslint/json';
import { FioriJSONSourceCode } from './json/source-code';
import type { AnyNode, MemberNode } from '@humanwhocodes/momoa';
import { FioriXMLSourceCode } from './xml/source-code';
import type { XMLAstNode, XMLToken } from '@xml-tools/ast';
import type { FioriRuleDefinition } from '../types';
import { FioriAnnotationSourceCode } from './annotations/source-code';
import type { AnyNode as AnyAnnotationNode } from '@sap-ux/odata-annotation-core';
import { DiagnosticCache } from './diagnostic-cache';
import type { Diagnostic } from './diagnostics';
import type { DeepestExistingPathResult } from '../utils/helpers';
import { findDeepestExistingPath } from '../utils/helpers';
import { pathToFileURL } from 'node:url';
import { normalizePath } from '@sap-ux/project-access';
import { FioriChangeSourceCode } from './change/source-code';

/**
 * Rule context type for JSON-based rules.
 *
 * @template MessageIds - Union type of message IDs used in the rule
 * @template RuleOptions - Array type of rule option values
 */
export type JSONRuleContext<MessageIds extends string, RuleOptions extends unknown[]> = RuleContext<{
    LangOptions: FioriLanguageOptions;
    Code: FioriJSONSourceCode;
    RuleOptions: RuleOptions;
    Node: AnyNode;
    MessageIds: MessageIds;
}>;

/**
 * Rule context type for XML-based rules.
 *
 * @template MessageIds - Union type of message IDs used in the rule
 * @template RuleOptions - Array type of rule option values
 */
export type XMLRuleContext<MessageIds extends string, RuleOptions extends unknown[]> = RuleContext<{
    LangOptions: FioriLanguageOptions;
    Code: FioriXMLSourceCode;
    RuleOptions: RuleOptions;
    Node: XMLAstNode | XMLToken;
    MessageIds: MessageIds;
}>;

/**
 * Rule context type for annotation-based rules.
 *
 * @template MessageIds - Union type of message IDs used in the rule
 * @template RuleOptions - Array type of rule option values
 */
export type AnnotationRuleContext<MessageIds extends string, RuleOptions extends unknown[]> = RuleContext<{
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
 * @param param0.createJsonVisitorHandler
 * @param param0.createChangeVisitorHandler
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
    createJsonVisitorHandler,
    createChangeVisitorHandler,
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
    createChangeVisitorHandler?: (
        context: JSONRuleContext<MessageIds, RuleOptions>,
        diagnostic: Extract<Diagnostic, { type: T }>
    ) => (node: MemberNode) => void;
    createJsonVisitorHandler?: (
        context: JSONRuleContext<MessageIds, RuleOptions>,
        diagnostic: Extract<Diagnostic, { type: T }>,
        deepestPathResult: DeepestExistingPathResult
    ) => (node: MemberNode) => void;
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
            const uri = pathToFileURL(normalizePath(context.filename)).toString();
            let cachedDiagnostics = DiagnosticCache.getMessages(uri, ruleId);
            if (!cachedDiagnostics) {
                cachedDiagnostics = check(context);
                DiagnosticCache.addMessages(uri, ruleId, cachedDiagnostics);
            }
            const sourceCode = context.sourceCode;
            if (sourceCode instanceof FioriChangeSourceCode && createChangeVisitorHandler) {
                return createChangeVisitor(
                    sourceCode,
                    cachedDiagnostics,
                    context as JSONRuleContext<MessageIds, RuleOptions>,
                    createChangeVisitorHandler
                );
            }
            if (sourceCode instanceof FioriJSONSourceCode && createJsonVisitorHandler) {
                return createJsonVisitorWithMatchers(
                    sourceCode,
                    cachedDiagnostics,
                    context as JSONRuleContext<MessageIds, RuleOptions>,
                    createJsonVisitorHandler
                );
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

/**
 * Creates a JSON visitor with matchers for applicable diagnostics.
 *
 * @param sourceCode
 * @param cachedDiagnostics
 * @param context
 * @param createJsonVisitorHandler
 */
function createJsonVisitorWithMatchers<
    MessageIds extends string,
    RuleOptions extends unknown[],
    T extends Diagnostic['type']
>(
    sourceCode: FioriJSONSourceCode,
    cachedDiagnostics: Extract<Diagnostic, { type: T }>[],
    context: JSONRuleContext<MessageIds, RuleOptions>,
    createJsonVisitorHandler: (
        context: JSONRuleContext<MessageIds, RuleOptions>,
        diagnostic: Extract<Diagnostic, { type: T }>,
        deepestPathResult: DeepestExistingPathResult
    ) => (node: MemberNode) => void
): RuleVisitor {
    const applicableDiagnostics = cachedDiagnostics.filter(
        (diagnostic) => (diagnostic as any).manifest?.uri === sourceCode.uri
    );
    if (applicableDiagnostics.length === 0) {
        return {};
    }
    const matchers: RuleVisitor = {};
    for (const diagnostic of applicableDiagnostics) {
        const paths = findDeepestExistingPath(
            (diagnostic as any).manifest?.object,
            (diagnostic as any).manifest?.propertyPath
        );
        if (paths?.validatedPath && paths.validatedPath.length > 0) {
            matchers[sourceCode.createMatcherString(paths.validatedPath)] = createJsonVisitorHandler(
                context,
                diagnostic,
                paths
            );
        }
    }
    return matchers;
}

/**
 * Creates a FlexChange rule visitor for applicable diagnostics.
 *
 * @param sourceCode
 * @param cachedDiagnostics
 * @param context
 * @param createChangeVisitorHandler
 */
function createChangeVisitor<MessageIds extends string, RuleOptions extends unknown[], T extends Diagnostic['type']>(
    sourceCode: FioriChangeSourceCode,
    cachedDiagnostics: Extract<Diagnostic, { type: T }>[],
    context: JSONRuleContext<MessageIds, RuleOptions>,
    createChangeVisitorHandler: (
        context: JSONRuleContext<MessageIds, RuleOptions>,
        diagnostic: Extract<Diagnostic, { type: T }>
    ) => (node: MemberNode) => void
): RuleVisitor {
    // Find the diagnostic applicable to the .change file. Always a single property value issue in one file.
    const applicableDiagnostics = cachedDiagnostics.find(
        (diagnostic) => (diagnostic as any).changeFileUri === sourceCode.uri
    );
    if (!applicableDiagnostics) {
        return {};
    }
    const path = 'Member[name.value="content"] > Object > Member[name.value="newValue"]'; // Always the same path to new value
    return { [path]: createChangeVisitorHandler(context, applicableDiagnostics) };
}
