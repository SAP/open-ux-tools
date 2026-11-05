/**
 * @file Detect usage of `console.log` and related console methods.
 */

import type { Rule } from 'eslint';

const CONSOLE_INTERFACE = [
    'console.log',
    'console.warn',
    'console.info',
    'console.error',
    'window.console.log',
    'window.console.warn',
    'window.console.info',
    'window.console.error'
] as const;

/**
 * Returns `"obj.method"` for a call expression, or `""` if no object is present.
 *
 * @param node
 * @param node.callee
 * @param node.callee.type
 * @param node.callee.object
 * @param node.callee.object.name
 * @param node.callee.object.type
 * @param node.callee.object.object
 * @param node.callee.object.object.name
 * @param node.callee.object.property
 * @param node.callee.object.property.name
 * @param node.callee.property
 * @param node.callee.property.name
 * @param node.callee.name
 */
function getFunctionExpressionStatement(node: {
    callee: {
        type: string;
        object?: { name?: string; type?: string; object?: { name?: string }; property?: { name?: string } };
        property?: { name: string };
        name?: string;
    };
}): string {
    const callee = node.callee;
    if (callee.type !== 'MemberExpression') {
        return '';
    }
    if (!callee.object) {
        return '';
    }
    const methodName = callee.property?.name ?? '';
    if (callee.object.type === 'MemberExpression') {
        const objectName = `${callee.object.object?.name ?? ''}.${callee.object.property?.name ?? ''}`;
        return `${objectName}.${methodName}`;
    }
    const objectName = callee.object.name ?? '';
    return `${objectName}.${methodName}`;
}

/**
 * Returns `"obj.prop"` for the right-hand side of a variable declarator whose init is a MemberExpression.
 *
 * @param node
 * @param node.init
 * @param node.init.object
 * @param node.init.object.name
 * @param node.init.object.type
 * @param node.init.object.object
 * @param node.init.object.object.name
 * @param node.init.object.property
 * @param node.init.object.property.name
 * @param node.init.property
 * @param node.init.property.name
 */
function getFullVarValueExpressionStatement(node: {
    init: {
        object?: { name?: string; type?: string; object?: { name?: string }; property?: { name?: string } };
        property?: { name?: string };
    };
}): string {
    const init = node.init;
    const secondPart = init.property?.name ?? '';
    if (init.object?.type === 'MemberExpression') {
        const firstPart = `${init.object.object?.name ?? ''}.${init.object.property?.name ?? ''}`;
        return `${firstPart}.${secondPart}`;
    }
    const firstPart = init.object?.name ?? '';
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
                    init?: {
                        type?: string;
                        object?: {
                            name?: string;
                            type?: string;
                            object?: { name?: string };
                            property?: { name?: string };
                        };
                        property?: { name?: string };
                    };
                };
                if (declaratorNode.init?.type === 'MemberExpression') {
                    const fullExpression = getFullVarValueExpressionStatement(
                        declaratorNode as {
                            init: {
                                object?: {
                                    name?: string;
                                    type?: string;
                                    object?: { name?: string };
                                    property?: { name?: string };
                                };
                                property?: { name?: string };
                            };
                        }
                    );
                    if ((CONSOLE_INTERFACE as readonly string[]).includes(fullExpression)) {
                        context.report({ node, messageId: 'consoleNotAllowed' });
                    }
                }
            },
            CallExpression(node) {
                const callNode = node as unknown as {
                    callee: {
                        type: string;
                        object?: {
                            name?: string;
                            type?: string;
                            object?: { name?: string };
                            property?: { name?: string };
                        };
                        property?: { name: string };
                        name?: string;
                    };
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
