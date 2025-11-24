/**
 * @file Checks if autowait is true in Opa5.extendConfig
 */

import type { Rule } from 'eslint';

//------------------------------------------------------------------------------
// Rule Definition
//------------------------------------------------------------------------------

const rule: Rule.RuleModule = {
    meta: {
        type: 'problem',
        docs: {
            description: 'Fiori custom ESLint rule',
            category: 'Best Practices',
            recommended: false
        },
        messages: {
            autowaitTrue: 'Autowait must be true.',
            autowaitPresent: 'Autowait must be present and true in extendConfig.'
        },
        schema: []
    },
    create(context: Rule.RuleContext) {
        //----------------------------------------------------------------------
        // Helpers
        //----------------------------------------------------------------------

        // any helper functions should go here or else delete this section

        //----------------------------------------------------------------------
        // Public
        //----------------------------------------------------------------------

        /**
         * Check if node is Opa5.extendConfig call expression
         */
        function isOpa5ExtendConfigCall(node: any): boolean {
            return (
                node.callee.type === 'MemberExpression' &&
                node.callee.object &&
                'name' in node.callee.object &&
                node.callee.object.name === 'Opa5' &&
                node.callee.property &&
                'name' in node.callee.property &&
                node.callee.property.name === 'extendConfig'
            );
        }

        /**
         * Find autoWait property in object expression properties
         */
        function findAutoWaitProperty(propsList: any[]): { exists: boolean; value?: boolean } {
            for (const property in propsList) {
                const prop = propsList[property];
                if (prop.type === 'Property' && 'key' in prop && 'name' in prop.key && prop.key.name === 'autoWait') {
                    const value = 'value' in prop && 'value' in prop.value ? prop.value.value : undefined;
                    return { exists: true, value };
                }
            }
            return { exists: false };
        }

        /**
         * Handle Opa5.extendConfig call expression validation
         */
        function handleOpa5ExtendConfig(node: any): void {
            if (node.arguments[0]?.type !== 'ObjectExpression') {
                return;
            }

            const propsList = node.arguments[0].properties;
            const autoWaitInfo = findAutoWaitProperty(propsList);

            if (!autoWaitInfo.exists) {
                context.report({ node: node, messageId: 'autowaitPresent' });
            } else if (!autoWaitInfo.value) {
                context.report({ node: node, messageId: 'autowaitTrue' });
            }
        }

        return {
            CallExpression(node): void {
                if (isOpa5ExtendConfigCall(node)) {
                    handleOpa5ExtendConfig(node);
                }
            }
        };
    }
};

export default rule;
