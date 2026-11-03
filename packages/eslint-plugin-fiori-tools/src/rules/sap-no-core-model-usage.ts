/**
 * @file Detect usage of `getModel()` and `setModel()` on `sap.ui.getCore()`.
 */

import type { Rule } from 'eslint';
import { isIdentifier, isMember, type IdentifierNode, type MemberExpressionNode } from '../utils/helpers.js';

const FORBIDDEN_CORE_METHODS = ['getModel', 'setModel'] as const;

/**
 * Returns true if node is a direct `sap.ui` member expression.
 *
 * @param node
 */
function isSapUi(node: unknown): boolean {
    if (!isMember(node)) {
        return false;
    }
    const member = node as MemberExpressionNode;
    const obj = member.object as IdentifierNode | undefined;
    const prop = member.property as IdentifierNode | undefined;
    return obj?.name === 'sap' && prop?.name === 'ui';
}

/**
 * Returns true if node is `sap.ui` or a variable aliasing it.
 *
 * @param node
 * @param sapUiObjects
 */
function isSapUiObject(node: unknown, sapUiObjects: string[]): boolean {
    return isSapUi(node) || (isIdentifier(node) && sapUiObjects.includes((node as IdentifierNode).name));
}

/**
 * Returns true if node is a `sap.ui.getCore()` call expression.
 *
 * @param node
 * @param sapUiObjects
 */
function isCore(node: unknown, sapUiObjects: string[]): boolean {
    if (!node || (node as { type: string }).type !== 'CallExpression') {
        return false;
    }
    const call = node as { callee: unknown };
    if (!isMember(call.callee)) {
        return false;
    }
    const callee = call.callee as MemberExpressionNode;
    const prop = callee.property as IdentifierNode | undefined;
    return prop?.name === 'getCore' && isSapUiObject(callee.object, sapUiObjects);
}

/**
 * Returns true if node is `sap.ui.getCore()` or a variable aliasing it.
 *
 * @param node
 * @param sapUiObjects
 * @param coreObjects
 */
function isCoreObject(node: unknown, sapUiObjects: string[], coreObjects: string[]): boolean {
    return isCore(node, sapUiObjects) || (isIdentifier(node) && coreObjects.includes((node as IdentifierNode).name));
}

const rule: Rule.RuleModule = {
    meta: {
        type: 'problem',
        docs: {
            description: 'Detect usage of `getModel()` and `setModel()` on `sap.ui.getCore()`.',
            recommended: true
        },
        messages: {
            coreGetModel: 'Avoid using `getModel()` on `sap.ui.getCore()`. Consider using component model instead.',
            coreSetModel: 'Avoid using `setModel()` on `sap.ui.getCore()`. Consider using component model instead.'
        },
        schema: []
    },
    create(context: Rule.RuleContext) {
        const sapUiObjects: string[] = [];
        const coreObjects: string[] = [];

        /**
         * Stores an alias for `sap.ui` or `sap.ui.getCore()` if detected.
         *
         * @param left
         * @param right
         */
        function rememberAlias(left: unknown, right: unknown): void {
            if (isIdentifier(left)) {
                if (isSapUiObject(right, sapUiObjects)) {
                    sapUiObjects.push((left as IdentifierNode).name);
                } else if (isCoreObject(right, sapUiObjects, coreObjects)) {
                    coreObjects.push((left as IdentifierNode).name);
                }
            }
        }

        return {
            VariableDeclarator(node) {
                const declarator = node as unknown as { id: unknown; init: unknown };
                rememberAlias(declarator.id, declarator.init);
            },
            AssignmentExpression(node) {
                const assignment = node as unknown as { left: unknown; right: unknown };
                rememberAlias(assignment.left, assignment.right);
            },
            MemberExpression(node) {
                const member = node as unknown as MemberExpressionNode;
                if (!isCoreObject(member.object, sapUiObjects, coreObjects)) {
                    return;
                }
                const prop = member.property as IdentifierNode | undefined;
                if (!isIdentifier(prop) || !(FORBIDDEN_CORE_METHODS as readonly string[]).includes(prop?.name ?? '')) {
                    return;
                }
                const messageId = prop?.name === 'getModel' ? 'coreGetModel' : 'coreSetModel';
                context.report({ node, messageId });
            }
        };
    }
};

export default rule;
