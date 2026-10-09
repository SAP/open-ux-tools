/**
 * @file Detect usage of `console.log` and related console methods.
 */

import type { Rule } from 'eslint';

const CONSOLE_INTERFACE = ['console.log', 'console.warn', 'console.info', 'console.error'] as const;

/**
 * Returns `"obj.method"` for a call expression, or `""` if no object is present.
 *
 * @param node
 * @param node.callee
 * @param node.callee.type
 * @param node.callee.object
 * @param node.callee.object.name
 * @param node.callee.property
 * @param node.callee.property.name
 * @param node.callee.name
 */
function getFunctionExpressionStatement(node: {
    callee: { type: string; object?: { name?: string }; property?: { name: string }; name?: string };
}): string {
    const callee = node.callee;
    if (callee.type !== 'MemberExpression') {
        return '';
    }
    if (!callee.object) {
        return '';
    }
    const objectName = callee.object.name ?? '';
    const methodName = callee.property?.name ?? '';
    return `${objectName}.${methodName}`;
}

/**
 * Returns `"obj.prop"` for the right-hand side of a variable declarator whose init is a MemberExpression.
 *
 * @param node
 * @param node.init
 * @param node.init.object
 * @param node.init.object.name
 * @param node.init.property
 * @param node.init.property.name
 */
function getFullVarValueExpressionStatement(node: {
    init: { object?: { name?: string }; property?: { name?: string } };
}): string {
    const init = node.init;
    const firstPart = init.object?.name ?? '';
    const secondPart = init.property?.name ?? '';
    return `${firstPart}.${secondPart}`;
}

const rule: Rule.RuleModule = {
    meta: {
        type: 'problem',
        docs: {
            description: 'Detect usage of `console.log` and related console methods.',
            recommended: true
        },
        messages: {
            consoleNotAllowed: 'Use Log from sap/base/Log (Log.info, Log.debug, Log.error) instead of console.log'
        },
        schema: []
    },
    create(context: Rule.RuleContext) {
        return {
            VariableDeclarator(node) {
                const declaratorNode = node as unknown as {
                    init?: { type?: string; object?: { name?: string }; property?: { name?: string } };
                };
                if (declaratorNode.init?.type === 'MemberExpression') {
                    const fullExpression = getFullVarValueExpressionStatement(
                        declaratorNode as { init: { object?: { name?: string }; property?: { name?: string } } }
                    );
                    if ((CONSOLE_INTERFACE as readonly string[]).includes(fullExpression)) {
                        context.report({ node, messageId: 'consoleNotAllowed' });
                    }
                }
            },
            CallExpression(node) {
                const callNode = node as unknown as {
                    callee: { type: string; object?: { name?: string }; property?: { name: string }; name?: string };
                };
                const fullExpression = getFunctionExpressionStatement(callNode);
                if ((CONSOLE_INTERFACE as readonly string[]).includes(fullExpression)) {
                    context.report({ node, messageId: 'consoleNotAllowed' });
                }
            }
        };
    }
};

export default rule;
