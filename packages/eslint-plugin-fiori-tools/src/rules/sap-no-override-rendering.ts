/**
 * @file Rule to flag override of getters, setters, onBeforeRendering
 *               and onAfterRendering for SAPUI5 object from a list of
 *               namespaces
 */

import type { Rule, SourceCode } from 'eslint';
import { contains } from '../utils/helpers';

// ------------------------------------------------------------------------------
// Rule Disablement
// ------------------------------------------------------------------------------

// ------------------------------------------------------------------------------
// Rule Definition
// ------------------------------------------------------------------------------

/**
 * Remove duplicate elements from an array.
 *
 * @param array The array to remove duplicates from
 * @returns Array with duplicates removed
 */
function uniquifyArray<T>(array: T[]): T[] {
    const a = array.concat();
    for (let i = 0; i < a.length; ++i) {
        for (let j = i + 1; j < a.length; ) {
            if (a[i] === a[j]) {
                a.splice(j, 1);
            } else {
                ++j;
            }
        }
    }
    return a;
}

/**
 * Calculate the object name from a member expression object.
 *
 * @param memberExpressionObject The member expression object to analyze
 * @returns The calculated object name
 */
function calculateObjectName(memberExpressionObject: any): string {
    let objectName = '';
    if (memberExpressionObject.type === 'MemberExpression') {
        objectName = memberExpressionObject.property.name;
    } else if (memberExpressionObject.type === 'Identifier') {
        objectName = memberExpressionObject.name;
    }
    return objectName;
}

/**
 * Check if ancestors array contains a NewExpression and return its position.
 *
 * @param ancestors The array of ancestor nodes to check
 * @returns The position of the NewExpression or -1 if not found
 */
function checkIfAncestorsContainsNewExpression(ancestors: ReturnType<SourceCode['getAncestors']>): number {
    const ancestorsLength = ancestors.length;
    for (let i = 0; i < ancestorsLength; i++) {
        if (ancestors[i].type === 'NewExpression') {
            return i;
        }
    }
    return -1;
}

const rule: Rule.RuleModule = {
    meta: {
        type: 'problem',
        docs: {
            description: 'fiori tools (fiori custom) ESLint rule',
            category: 'Best Practices',
            recommended: false
        },
        messages: {
            overrideRendering: 'Override of rendering or getter or setter is not permitted'
        },
        schema: [
            {
                type: 'object',
                properties: {
                    ns: {
                        type: 'array',
                        description: 'Array of custom namespaces',
                        items: {
                            type: 'string'
                        }
                    }
                },
                additionalProperties: false
            }
        ],
        defaultOptions: [{}]
    },
    create(context: Rule.RuleContext) {
        const sourceCode = context.sourceCode ?? context.getSourceCode();
        const customNS = context.options[0]?.ns ? context.options[0].ns : [];
        const configuration = {
            'ns': uniquifyArray(
                [
                    'sap.ui.core',
                    'sap.apf',
                    'sap.ca.scfld.md',
                    'sap.ca.ui',
                    'sap.chart',
                    'sap.collaboration',
                    'sap.fiori',
                    'sap.landvisz',
                    'sap.m',
                    'sap.makit',
                    'sap.me',
                    'sap.ndc',
                    'sap.ovp',
                    'sap.portal.ui5',
                    'sap.suite.ui.commons',
                    'sap.suite.ui.generic.template',
                    'sap.suite.ui.microchart',
                    'sap.tnt',
                    'sap.ui.commons',
                    'sap.ui.comp',
                    'sap.ui.dt',
                    'sap.ui.fl',
                    'sap.ui.generic.app',
                    'sap.ui.generic.template',
                    'sap.ui.layout',
                    'sap.ui.richtexteditor',
                    'sap.ui.rta',
                    'sap.ui.server.abap',
                    'sap.ui.server.java',
                    'sap.ui.suite',
                    'sap.ui.table',
                    'sap.ui.unified',
                    'sap.ui.ux3',
                    'sap.ui.vbm',
                    'sap.ui.vk',
                    'sap.uiext.inbox',
                    'sap.ushell',
                    'sap.uxap',
                    'sap.viz'
                ].concat(customNS)
            )
        };
        const ui5ObjectsToCheck: string[] = [];
        const CHECKED_METHODS = ['onBeforeRendering', 'onAfterRendering'];

        // --------------------------------------------------------------------------
        // Helpers
        // --------------------------------------------------------------------------

        /**
         * Check if a property represents a not allowed method.
         *
         * @param property The property name to check
         * @returns True if the property represents a not allowed method
         */
        function checkIfNotAllowedMethod(property: string): boolean {
            if (
                property !== undefined &&
                (contains(CHECKED_METHODS, property) || property.startsWith('get') || property.startsWith('set'))
            ) {
                return true;
            }
            return false;
        }

        /**
         * Check if a namespace should be reported for violations.
         *
         * @param namespace The namespace string to check
         * @returns True if the namespace should be reported for violations
         */
        function checkIfReportedNamespace(namespace: string): boolean {
            for (const ns of configuration.ns) {
                if (namespace.startsWith(ns + '.')) {
                    return true;
                }
            }
            return false;
        }

        /**
         * Process member expressions for rendering override violations.
         *
         * @param node The member expression node to process
         */
        function processMemberExpression(node: any): void {
            if (node.object.type === 'Identifier') {
                let namespace = node.object.name + '.' + node.property.name;
                const ancestors = sourceCode.getAncestors(node);

                ancestors.reverse();
                const newExpressionPosition = checkIfAncestorsContainsNewExpression(ancestors);
                if (newExpressionPosition !== -1) {
                    for (let i = 0; i < newExpressionPosition; i++) {
                        const ancestor = ancestors[i] as any;
                        if (ancestor && 'property' in ancestor && ancestor.property && 'name' in ancestor.property) {
                            const propertyName = ancestor.property.name;
                            namespace += '.' + propertyName;
                        }
                    }

                    const targetAncestor = ancestors[newExpressionPosition] as any;
                    if (
                        checkIfReportedNamespace(namespace) &&
                        targetAncestor &&
                        'parent' in targetAncestor &&
                        targetAncestor.parent &&
                        'id' in targetAncestor.parent &&
                        targetAncestor.parent.id
                    ) {
                        ui5ObjectsToCheck.push(targetAncestor.parent.id.name);
                    }
                }
            }
        }

        /**
         * Check assignment expressions against rendering override violations.
         *
         * @param node The assignment expression node to check
         */
        function checkAssignmentAgainstOverride(node: any): void {
            if (node.left.type === 'MemberExpression' && node.right.type === 'FunctionExpression') {
                const memberExpression = node.left,
                    objectProperty = memberExpression.property.name;
                let objectNameToCheck;
                const memberExpressionObject = memberExpression.object;

                if (checkIfNotAllowedMethod(objectProperty)) {
                    objectNameToCheck = calculateObjectName(memberExpressionObject);
                    if (contains(ui5ObjectsToCheck, objectNameToCheck)) {
                        context.report({
                            node: node,
                            messageId: 'overrideRendering'
                        });
                    }
                }
            }
        }

        // --------------------------------------------------------------------------
        // Public
        // --------------------------------------------------------------------------

        return {
            'MemberExpression': function (node): void {
                processMemberExpression(node);
            },
            'AssignmentExpression': function (node): void {
                checkAssignmentAgainstOverride(node);
            }
        };
    }
};

export default rule;
