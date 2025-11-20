/**
 * @file Check "sap-ui5-no-private-prop" should detect the usage of private properties and functions of UI5 elements
 */

import type { Rule } from 'eslint';
import {
    isIdentifier,
    isCall,
    startsWith,
    contains,
    getIdentifierPath,
    resolveIdentifierPath,
    createVariableDeclaratorProcessor,
    hasUnderscore
} from '../utils/ast-helpers';

// ------------------------------------------------------------------------------
// Rule Disablement
// ------------------------------------------------------------------------------

// ------------------------------------------------------------------------------
// Rule Definition
// ------------------------------------------------------------------------------
const rule: Rule.RuleModule = {
    meta: {
        type: 'problem',
        docs: {
            description:
                'Check "sap-ui5-no-private-prop" should detect the usage of private properties and functions of UI5 elements',
            category: 'Best Practices',
            recommended: false
        },
        messages: {
            privateProperty: 'Usage of a private property or function from UI5 element.'
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
        /**
         * Remove duplicate elements from an array.
         *
         * @param array The array to remove duplicates from
         * @returns Array with duplicates removed
         */
        function uniquifyArray(array): any[] {
            const a = array.concat();
            for (let i = 0; i < a.length; ++i) {
                for (let j = i + 1; j < a.length; ++j) {
                    if (a[i] === a[j]) {
                        a.splice(j--, 1);
                    }
                }
            }
            return a;
        }
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
        const IGNORE = [
            'sap.ui.core.ValueState.Success',
            'sap.ui.core.ValueState.Warning',
            'sap.ui.core.ValueState.Error',
            'sap.ui.core.ValueState.None'
        ];

        const VARIABLES = {};

        /**
         * Check if a path is interesting for private property analysis.
         *
         * @param path The path string to analyze
         * @returns True if the path is interesting for private property analysis
         */
        function isinterestingPath(path): boolean {
            let i;
            const options = configuration.ns;
            if (contains(IGNORE, path)) {
                return false;
            }
            for (i = 0; i < options.length; i++) {
                if (
                    startsWith(path, options[i]) &&
                    (path.length === options[i].length || path[options[i].length] === '.')
                ) {
                    return true;
                }
            }
            return false;
        }

        // Create the variable declarator processor using the shared utility
        const processVariableDeclarator = createVariableDeclaratorProcessor(VARIABLES, isinterestingPath);

        /**
         * Check if an identifier is a special case for member expressions.
         *
         * @param identifier The identifier string to check
         * @returns True if the identifier is a special case for member expressions
         */
        function isSpecialCaseIdentifierForMemberExpression(identifier): boolean {
            return identifier === '__proto__';
        }

        return {
            'VariableDeclarator': processVariableDeclarator,
            // "AssignmentExpression": function(node) {},
            'MemberExpression': function (node): void {
                if (!node.property || !('name' in node.property)) {
                    return;
                }
                const identifier = node.property.name;

                if (
                    typeof identifier !== 'undefined' &&
                    // && hasUnderscore(identifier)
                    !isSpecialCaseIdentifierForMemberExpression(identifier)
                ) {
                    const parent = sourceCode.getAncestors(node).pop();
                    if (!parent) {
                        return;
                    }
                    switch (parent.type) {
                        case 'ExpressionStatement':
                        case 'AssignmentExpression':
                        case 'CallExpression':
                            let path = getIdentifierPath(node);
                            path = resolveIdentifierPath(path, VARIABLES);
                            if (
                                isinterestingPath(path) &&
                                isIdentifier(node.property) &&
                                'name' in node.property &&
                                (!isCall(node.parent) || hasUnderscore(node.property.name))
                            ) {
                                context.report({ node: node, messageId: 'privateProperty' });
                            }
                            break;
                        default:
                    }
                }
            }
        };
    }
};

export default rule;
