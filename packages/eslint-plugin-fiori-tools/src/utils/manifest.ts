import type { RuleVisitor } from '@eslint/core';
import type { MemberNode } from '@humanwhocodes/momoa';

import type { Diagnostic } from '../language/diagnostics';
import type { JSONRuleContext } from '../language/rule-factory';
import type { DeepestExistingPathResult } from './helpers';
import { findDeepestExistingPath } from './helpers';

/**
 * Creates JSON rule visitors based on diagnostics.
 *
 * @param processMatchedNode - Function to process matched JSON AST node and report messages.
 * @returns A function that creates JSON rule visitors based on diagnostics.
 */
export function createJsonHandler<MessageIds extends string, RuleOptions extends unknown[], T>(
    processMatchedNode: (
        context: JSONRuleContext<MessageIds, RuleOptions>,
        diagnostic: Extract<Diagnostic, { type: T }>,
        deepestPathResult: DeepestExistingPathResult
    ) => (node: MemberNode) => void
): (
    context: JSONRuleContext<MessageIds, RuleOptions>,
    validationResult: Extract<Diagnostic, { type: T }>[]
) => RuleVisitor {
    return function createJson(context, diagnostics) {
        const applicableDiagnostics = diagnostics.filter(
            (diagnostic) => diagnostic.manifest.uri === context.sourceCode.uri
        );
        if (applicableDiagnostics.length === 0) {
            return {};
        }
        const matchers: RuleVisitor = {};
        for (const diagnostic of applicableDiagnostics) {
            const paths = findDeepestExistingPath(
                diagnostic.manifest.object,
                diagnostic.manifest.requiredPropertyPath,
                diagnostic.manifest.optionalPropertyPath
            );
            if (paths) {
                matchers[context.sourceCode.createMatcherString(paths.validatedPath)] = processMatchedNode(
                    context,
                    diagnostic,
                    paths
                );
            }
        }
        return matchers;
    };
}
