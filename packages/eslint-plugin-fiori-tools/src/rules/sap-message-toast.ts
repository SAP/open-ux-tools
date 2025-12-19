/**
 * @file Rule to ensure the usage ot the correct method options for
 *               sap.m.MessageToast.show
 */

import type { Rule } from 'eslint';
import {
    getIdentifierPath,
    resolveIdentifierPath,
    createVariableDeclaratorProcessor,
    isInteger,
    endsWith,
    type ASTNode
} from '../utils/helpers';

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
// Helper Functions
// ------------------------------------------------------------------------------

/**
 * Extract numeric value from EM unit string.
 *
 * @param value The string value to parse (e.g., "2em")
 * @returns The numeric value extracted from the EM unit string
 */
function getEMValue(value: string): number {
    if (endsWith(value, 'em')) {
        return Number(value.replace('em', ''));
    }
    return 0;
}

// ------------------------------------------------------------------------------
// Rule Definition
// ------------------------------------------------------------------------------
const rule: Rule.RuleModule = {
    meta: {
        type: 'problem',
        docs: {
            description: 'fiori tools (fiori custom) ESLint rule',
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
        const X_UNARY = 'UnaryExpression';
        const VARIABLES: Record<string, string[]> = {};

        const _CALLEE_NAME = 'sap.m.MessageToast.show';

        const DURATION_MIN = 3000;
        const WIDTH_MAX = 35;
        const POSITION_DEFAULT = 'center bottom';

        /**
         * Check if a path matches interesting MessageToast API calls.
         *
         * @param path The API path to check
         * @returns True if the path matches interesting MessageToast API calls
         */
        function isInterestingPath(path: string): boolean {
            const parts = path.split('.');
            let isInteresting = false;
            let interestingPath: Record<string, any> = INTERESTING_PATH;
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

        // Create the variable declarator processor using the shared utility
        const processVariableDeclarator = createVariableDeclaratorProcessor(VARIABLES, isInterestingPath);

        /**
         * Validate duration property for MessageToast.
         *
         * @param node The function call node
         * @param property The property to validate
         */
        function validateDuration(node: ASTNode, property: any): void {
            const value = property.value.value;
            const isNegative = property.value.type === X_UNARY && property.value.operator === '-';

            if ((isInteger(value) && value < DURATION_MIN) || isNegative) {
                context.report({
                    node,
                    messageId: 'invalidDuration',
                    data: { min: DURATION_MIN.toString() }
                });
            }
        }

        /**
         * Validate width property for MessageToast.
         *
         * @param node The function call node
         * @param property The property to validate
         */
        function validateWidth(node: ASTNode, property: any): void {
            const value = property.value.value;
            if (getEMValue(value) > WIDTH_MAX) {
                context.report({
                    node,
                    messageId: 'invalidWidth',
                    data: { max: WIDTH_MAX.toString() }
                });
            }
        }

        /**
         * Validate position property (my/at) for MessageToast.
         *
         * @param node The function call node
         * @param property The property to validate
         * @param name The property name
         */
        function validatePosition(node: ASTNode, property: any, name: string): void {
            const value = property.value.value;
            if (typeof value === 'string' && value !== POSITION_DEFAULT) {
                context.report({
                    node,
                    messageId: 'invalidPosition',
                    data: { name, expected: POSITION_DEFAULT }
                });
            }
        }

        /**
         * Validate a single property of MessageToast options.
         *
         * @param node The function call node
         * @param property The property to validate
         */
        function validateProperty(node: ASTNode, property: any): void {
            const name = property.key.name;

            switch (name) {
                case 'duration':
                    validateDuration(node, property);
                    break;
                case 'width':
                    validateWidth(node, property);
                    break;
                case 'my':
                case 'at':
                    validatePosition(node, property, name);
                    break;
            }
        }

        /**
         * Validate MessageToast function call options for compliance violations.
         *
         * @param node The function call node to validate
         */
        function validateFunctionOptions(node: ASTNode): void {
            if ((node as any).arguments.length !== 2) {
                return;
            }

            const optionList = (node as any).arguments[1].properties;
            for (const key in optionList) {
                if (optionList.hasOwnProperty(key) && optionList[key].type === 'Property') {
                    validateProperty(node, optionList[key]);
                }
            }
        }

        /**
         * Process call expressions to detect MessageToast violations.
         *
         * @param node The call expression node to process
         */
        function processCallExpression(node: ASTNode): void {
            let path = getIdentifierPath((node as any).callee);
            path = resolveIdentifierPath(path, VARIABLES);

            if (isInterestingPath(path)) {
                validateFunctionOptions(node);
            }
        }

        return {
            'VariableDeclarator': processVariableDeclarator,
            'CallExpression': processCallExpression
        };
    }
};

export default rule;
