/**
 * @file Check "sap-ui5-no-private-prop" should detect the usage of private properties and functions of UI5 elements
 */

import type { Rule } from 'eslint';

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
         *
         * @param array
         */
        function uniquifyArray(array) {
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

        const X_CALL = 'CallExpression';
        const X_MEMBER = 'MemberExpression';
        const X_NEW = 'NewExpression';
        const X_IDENTIFIER = 'Identifier';
        const X_LITERAL = 'Literal';
        const VARIABLES = {};

        /**
         *
         * @param node
         * @param type
         */
        function isType(node: any, type: any) {
            return node?.type === type;
        }
        /**
         *
         * @param node
         */
        function isIdentifier(node: any) {
            return isType(node, 'Identifier');
        }
        /**
         *
         * @param node
         */
        function isCall(node: any) {
            return isType(node, 'CallExpression');
        }

        /**
         *
         * @param s
         * @param sub
         */
        function startsWith(s, sub) {
            return typeof s === 'string' && typeof sub === 'string' && s.substring(0, sub.length) === sub;
        }

        /**
         *
         * @param a
         * @param obj
         */
        function contains(a, obj) {
            return a.includes(obj);
        }

        /**
         *
         * @param node
         */
        function getLiteralOrIdentifiertName(node: any) {
            let result = '';
            switch (node.type) {
                case X_IDENTIFIER:
                    result = node.name;
                    break;
                case X_LITERAL:
                    result = node.value;
                    break;
                default:
            }
            return result;
        }

        /**
         *
         * @param node
         */
        function getIdentifierPath(node: any) {
            let result = '';
            if (node) {
                switch (node.type) {
                    case X_IDENTIFIER:
                        result = node.name;
                        break;
                    case X_MEMBER:
                        result = getIdentifierPath(node.object) + '.' + getLiteralOrIdentifiertName(node.property);
                        break;
                    case X_NEW:
                        result = getIdentifierPath(node.callee);
                        break;
                    case X_CALL:
                        result = getIdentifierPath(node.callee) + '().';
                        break;
                    default:
                }
            }
            return result;
        }

        // Method resolved IdentifierNames with known variables
        /**
         *
         * @param path
         */
        function resolveIdentifierPath(path) {
            const parts = path.split('.');
            let substitute = false;
            // check if current identifier is remembered as an interesting variable
            for (const name in VARIABLES) {
                if (name === parts[0]) {
                    // get last stored variable value
                    substitute = VARIABLES[name].slice(-1).pop();
                }
            }
            // if so, replace current identifier with its value
            if (substitute) {
                parts[0] = substitute;
                path = parts.join('.');
            }
            return path;
        }
        /**
         *
         * @param path
         */
        function isinterestingPath(path) {
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

        /**
         *
         * @param node
         * @param name
         */
        function rememberinterestingVariable(node: any, name: any) {
            if (typeof VARIABLES[node.id.name] === 'undefined') {
                VARIABLES[node.id.name] = [];
            }
            VARIABLES[node.id.name].push(name);
        }

        /**
         *
         * @param node
         */
        function processVariableDeclarator(node: any) {
            let path = getIdentifierPath(node.init);
            path = resolveIdentifierPath(path);
            // if declaration is interesting, remember identifier and resolved value
            if (isinterestingPath(path)) {
                rememberinterestingVariable(node, path);
            }
        }

        /**
         *
         * @param identifier
         */
        function hasUnderscore(identifier) {
            return identifier !== '_' && identifier[0] === '_';
        }

        /**
         *
         * @param identifier
         */
        function isSpecialCaseIdentifierForMemberExpression(identifier) {
            return identifier === '__proto__';
        }

        return {
            'VariableDeclarator': processVariableDeclarator,
            // "AssignmentExpression": function(node) {},
            'MemberExpression': function (node) {
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
                            path = resolveIdentifierPath(path);
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
