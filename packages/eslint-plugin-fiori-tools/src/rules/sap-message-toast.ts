/**
 * @file Rule to ensure the usage ot the correct method options for
 *               sap.m.MessageToast.show
 * @ESLint Version 0.17.1 / April 2015
 */

import type { Rule } from 'eslint';

const INTERESTING_PATH = {
    'sap': {
        'm': {
            'MessageToast': {
                'show': {}
            }
        }
    }
};

// ------------------------------------------------------------------------------
// Rule Disablement
// ------------------------------------------------------------------------------
/* eslint-disable strict */
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
            invalidDuration: 'Value for duration of sap.m.MessageToast.show should be greater or equal to {{min}}!',
            invalidWidth: 'Value for width of sap.m.MessageToast.show should be less or equal to {{max}}em!',
            invalidPosition: 'Value for {{name}} of sap.m.MessageToast.show should be {{expected}}!'
        },
        schema: []
    },
    create(context: Rule.RuleContext) {
        'use strict';

        const X_MEMBER = 'MemberExpression';
        const X_UNARY = 'UnaryExpression';
        // const X_CALL = "CallExpression";
        const X_IDENTIFIER = 'Identifier';
        // const X_LITERAL = "Literal";
        // const P_OBJECT = "ObjectPattern";
        // const P_ARRAY = "ArrayPattern";

        const VARIABLES = {};

        const _CALLEE_NAME = 'sap.m.MessageToast.show';

        const DURATION_MIN = 3000;
        const WIDTH_MAX = 35;
        const POSITION_DEFAULT = 'center bottom';

        /**
         *
         * @param i
         */
        function isInteger(i) {
            return Number(i) === i && i % 1 === 0;
        }

        /**
         *
         * @param s
         * @param sub
         */
        function endsWith(s, sub) {
            return (
                typeof s === 'string' && typeof sub === 'string' && s.substring(s.length - sub.length, s.length) === sub
            );
        }

        /**
         *
         * @param value
         */
        function getEMValue(value) {
            if (endsWith(value, 'em')) {
                return Number(value.replace('em', ''));
            }
            return 0;
        }

        /**
         *
         * @param node
         */
        function getLiteralOrIdentifiertName(node: any) {
            let result = '';
            if (node.type === X_IDENTIFIER) {
                result = node.name;
            } else {
                result = node.value;
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
            let substitution = false;
            // check if current identifier is remembered as an interesting variable
            for (const name in VARIABLES) {
                if (name === parts[0]) {
                    // get last stored variable value
                    substitution = VARIABLES[name].slice(-1).pop();
                }
            }
            // if so, replace current identifier with its value
            if (substitution) {
                parts[0] = substitution;
                path = parts.join('.');
            }
            return path;
        }

        /**
         *
         * @param path
         */
        function isInterestingPath(path) {
            const parts = path.split('.');
            let isInteresting = false;
            let interestingPath = INTERESTING_PATH;
            for (const key in parts) {
                if (interestingPath.hasOwnProperty(parts[key])) {
                    isInteresting = true;
                    interestingPath = interestingPath[parts[key]];
                } else {
                    isInteresting = false;
                    break;
                }
            }
            return isInteresting;
        }

        /**
         *
         * @param node
         * @param name
         */
        function rememberInterestingVariable(node: any, name: any) {
            //        if (node.id.type === X_IDENTIFIER) {
            if (typeof VARIABLES[node.id.name] === 'undefined') {
                VARIABLES[node.id.name] = [];
            }
            VARIABLES[node.id.name].push(name);
            //        }
        }

        /**
         *
         * @param node
         */
        function processVariableDeclarator(node: any) {
            //        if (node.init) {
            let path = getIdentifierPath(node.init);
            path = resolveIdentifierPath(path);
            // if declaration is interesting, remember identifier and resolved value
            if (isInterestingPath(path)) {
                rememberInterestingVariable(node, path);
            }
            //        }
        }

        /**
         *
         * @param node
         */
        function validateFunctionOptions(node: any) {
            if (node.arguments.length === 2) {
                const optionList = node.arguments[1].properties;
                for (const key in optionList) {
                    if (optionList.hasOwnProperty(key) && optionList[key].type === 'Property') {
                        const property = optionList[key];
                        const name = property.key.name;
                        const value = property.value.value;
                        switch (name) {
                            case 'duration':
                                if (
                                    (isInteger(value) && value < DURATION_MIN) ||
                                    // check if value is a negative value
                                    (property.value.type === X_UNARY && property.value.operator === '-')
                                ) {
                                    context.report({
                                        node,
                                        messageId: 'invalidDuration',
                                        data: { min: DURATION_MIN.toString() }
                                    });
                                }
                                break;
                            case 'width':
                                if (getEMValue(value) > WIDTH_MAX) {
                                    context.report({
                                        node,
                                        messageId: 'invalidWidth',
                                        data: { max: WIDTH_MAX.toString() }
                                    });
                                }
                                break;
                            case 'my':
                            case 'at':
                                if (typeof value === 'string' && value !== POSITION_DEFAULT) {
                                    context.report({
                                        node,
                                        messageId: 'invalidPosition',
                                        data: { name, expected: POSITION_DEFAULT }
                                    });
                                }
                                break;
                            default:
                        }
                    }
                }
            }
        }

        /**
         *
         * @param node
         */
        function processCallExpression(node: any) {
            //        if (node && node.type === X_CALL) {
            let path = getIdentifierPath(node.callee);
            path = resolveIdentifierPath(path);

            if (isInterestingPath(path)) {
                validateFunctionOptions(node);
            }
            //        }
        }

        return {
            'VariableDeclarator': processVariableDeclarator,
            'CallExpression': processCallExpression
        };
    }
};

export default rule;
