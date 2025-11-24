// ------------------------------------------------------------------------------
// Rule Disablement
// ------------------------------------------------------------------------------

import type { Rule } from 'eslint';
import type { ASTNode } from '../utils/helpers';

// ------------------------------------------------------------------------------
// Rule Definition
// ------------------------------------------------------------------------------
const rule: Rule.RuleModule = {
    meta: {
        type: 'problem',
        docs: {
            description: 'Fiori custom ESLint rule',
            category: 'Best Practices',
            recommended: false
        },
        messages: {
            legacyFactories:
                'Make use of sap.ui.define([...], function(...) {...} to load required dependencies. Legacy UI5 factories leading to synchronous loading.'
        },
        schema: []
    },
    create(context: Rule.RuleContext): Rule.NodeListener {
        const INTERESTING_METHODS = [
            'jsview',
            'component',
            'view',
            'xmlview',
            'controller',
            'extensionpoint',
            'fragment',
            'getVersionInfo',
            'resources',
            'load'
        ];
        const INTERESTING_METHODS_JQUERY = ['resources'];

        // --------------------------------------------------------------------------
        // Basic Helpers
        // --------------------------------------------------------------------------
        /**
         * Check if a node is of a specific type.
         *
         * @param node The AST node to check
         * @param type The type to check for
         * @returns True if the node is of the specified type
         */
        function isType(node: any, type: any): boolean {
            return node?.type === type;
        }

        /**
         * Check if a node is an Identifier.
         *
         * @param node The AST node to check
         * @returns True if the node is an Identifier
         */
        function isIdentifier(node: any): boolean {
            return isType(node, 'Identifier');
        }
        /**
         * Check if a node is a MemberExpression.
         *
         * @param node The AST node to check
         * @returns True if the node is a MemberExpression
         */
        function isMember(node: any): boolean {
            return isType(node, 'MemberExpression');
        }

        /**
         * Check if an array contains a specific object.
         *
         * @param a The array to search in
         * @param obj The object to search for
         * @returns True if the array contains the object
         */
        function contains(a, obj): boolean {
            return a.includes(obj);
        }

        /**
         * Check if callee matches sap.ui.* pattern
         */
        function isSapUiPattern(callee: any): boolean {
            return (
                isMember(callee) &&
                isIdentifier(callee.property) &&
                contains(INTERESTING_METHODS, callee.property.name) &&
                isMember(callee.object) &&
                callee.object.property.name === 'ui' &&
                isIdentifier(callee.object.object) &&
                callee.object.object.name === 'sap'
            );
        }

        /**
         * Check if callee matches jQuery.sap.* or $.sap.* pattern
         */
        function isJQuerySapPattern(callee: any): boolean {
            return (
                isMember(callee) &&
                isIdentifier(callee.property) &&
                contains(INTERESTING_METHODS_JQUERY, callee.property.name) &&
                isMember(callee.object) &&
                callee.object.property.name === 'sap' &&
                isIdentifier(callee.object.object) &&
                (callee.object.object.name === 'jQuery' || callee.object.object.name === '$')
            );
        }

        /**
         * Check if callee matches sap.ui.component.* pattern
         */
        function isSapUiComponentPattern(callee: any): boolean {
            return (
                isMember(callee) &&
                isIdentifier(callee.property) &&
                contains(INTERESTING_METHODS, callee.property.name) &&
                isMember(callee.object) &&
                callee.object.property.name === 'component' &&
                isMember(callee.object.object) &&
                callee.object.object.property.name === 'ui' &&
                isIdentifier(callee.object.object.object) &&
                callee.object.object.object.name === 'sap'
            );
        }

        /**
         * Check if a call expression represents an interesting legacy factory usage.
         *
         * @param node The call expression node to check
         * @returns True if the call expression represents an interesting legacy factory usage
         */
        function isInteresting(node: ASTNode): boolean {
            const callee = (node as any).callee;
            return isSapUiPattern(callee) || isJQuerySapPattern(callee) || isSapUiComponentPattern(callee);
        }

        return {
            'CallExpression': function (node): void {
                if (isInteresting(node)) {
                    context.report({ node: node, messageId: 'legacyFactories' });
                }
            }
        };
    }
};

export default rule;
