/**
 * @file Detect usage of `sap.ca.ui.FileUpload` and `sap.ca.ui.AddPicture` controls.
 */

import type { Rule } from 'eslint';
import { getMemberAsString } from '../utils/helpers.js';

const FORBIDDEN_UPLOAD_CONTROLS = ['sap.ca.ui.FileUpload', 'sap.ca.ui.AddPicture'] as const;

/**
 * Returns true if the callee node resolves to a forbidden upload control.
 *
 * @param callee
 */
function isForbiddenUploadControl(callee: unknown): boolean {
    const fullName = getMemberAsString(callee);
    return (FORBIDDEN_UPLOAD_CONTROLS as readonly string[]).includes(fullName);
}

const rule: Rule.RuleModule = {
    meta: {
        type: 'problem',
        docs: {
            description: 'Detect usage of `sap.ca.ui.FileUpload` and `sap.ca.ui.AddPicture` controls.',
            recommended: true
        },
        messages: {
            forbiddenUploadControl:
                'Dynamically constructed upload control. Uploaded files shall be sent to VSI 2.0 before stored on DB.'
        },
        schema: []
    },
    create(context: Rule.RuleContext) {
        return {
            NewExpression(node) {
                const callNode = node as unknown as { callee: unknown };
                if (callNode.callee && isForbiddenUploadControl(callNode.callee)) {
                    context.report({ node, messageId: 'forbiddenUploadControl' });
                }
            },
            CallExpression(node) {
                const callNode = node as unknown as { callee: unknown };
                if (callNode.callee && isForbiddenUploadControl(callNode.callee)) {
                    context.report({ node, messageId: 'forbiddenUploadControl' });
                }
            }
        };
    }
};

export default rule;
