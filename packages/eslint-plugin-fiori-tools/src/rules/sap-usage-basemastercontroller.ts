/**
 * @file     Check "sap-usage-basemastercontroller" should detect the usage of "sap.ca.scfld.md.controller.BaseMasterController" & "sap/ca/scfld/md/controller/BaseMasterController"..
 */

import type { RuleDefinition, RuleContext } from '@eslint/core';

// ------------------------------------------------------------------------------
// Type definitions
// ------------------------------------------------------------------------------

interface IdentifierNode {
    type: 'Identifier';
    name: string;
}

interface MemberExpressionNode {
    type: 'MemberExpression';
    object: unknown;
    property: unknown;
}

interface LiteralNode {
    type: 'Literal';
    value: string | number | boolean | null | RegExp;
}

// ------------------------------------------------------------------------------
// Helper functions
// ------------------------------------------------------------------------------

/**
 * Check if a value is a string.
 *
 * @param string The value to check
 * @returns True if the value is a string
 */
function isString(string: unknown): string is string {
    return typeof string === 'string';
}

/**
 * Check if a string contains a substring.
 *
 * @param string The string to search in
 * @param substring The substring to search for
 * @returns True if the string contains the substring
 */
function contains(string: string, substring: string): boolean {
    return string.includes(substring);
}

/**
 * Build a full member expression path.
 *
 * @param node The member expression node
 * @returns The full path as a string (e.g., "sap.ca.scfld.md.controller.BaseMasterController")
 */
function getMemberExpressionPath(node: unknown): string {
    const memberNode = node as MemberExpressionNode;

    if (memberNode.type !== 'MemberExpression') {
        return '';
    }

    const property = memberNode.property as IdentifierNode;
    const propertyName = property?.type === 'Identifier' ? property.name : '';

    const objectNode = memberNode.object as MemberExpressionNode | IdentifierNode;
    if (objectNode.type === 'MemberExpression') {
        const objectPath = getMemberExpressionPath(objectNode);
        return objectPath ? `${objectPath}.${propertyName}` : propertyName;
    } else if (objectNode.type === 'Identifier') {
        return `${objectNode.name}.${propertyName}`;
    }

    return propertyName;
}

// ------------------------------------------------------------------------------
// Rule Definition
// ------------------------------------------------------------------------------

const rule: RuleDefinition = {
    meta: {
        type: 'problem',
        docs: {
            description: 'fiori tools (fiori custom) ESLint rule',
            category: 'Best Practices',
            recommended: false
        },
        messages: {
            basemastercontroller:
                "Usage of deprecated 'BaseMasterController' detected. Please use 'ScfldMasterController' instead."
        },
        schema: []
    },
    create(context: RuleContext) {
        // --------------------------------------------------------------------------
        // Public
        // --------------------------------------------------------------------------
        return {
            'MemberExpression': function (node: unknown): void {
                const memberNode = node as MemberExpressionNode;
                const property = memberNode.property as IdentifierNode;

                if (property?.type === 'Identifier' && property.name === 'BaseMasterController') {
                    const fullPath = getMemberExpressionPath(node);
                    if (fullPath === 'sap.ca.scfld.md.controller.BaseMasterController') {
                        context.report({ node: node, messageId: 'basemastercontroller' });
                    }
                }
            },
            'Literal': function (node: unknown): void {
                const literalNode = node as LiteralNode;
                if (
                    isString(literalNode.value) &&
                    contains(literalNode.value, 'sap/ca/scfld/md/controller/BaseMasterController')
                ) {
                    context.report({ node: node, messageId: 'basemastercontroller' });
                }
            }
        };
    }
};

export default rule;
