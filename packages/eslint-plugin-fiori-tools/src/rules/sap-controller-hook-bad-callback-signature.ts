/**
 * @file Validate that @ControllerHook JSDoc callback signatures are well-formed and consistent with source code.
 */

import type { Rule } from 'eslint';
import type { Property, SimpleCallExpression, Identifier, MemberExpression } from 'estree';
import { ControllerHook, type CommentNode } from './utils/controller-hook.js';

const ERROR_MSG = 'Controller hook documentation contains malformed callback signature: ';

const ERROR_TYPES = {
    CALLBACK_MISSING_SIGNATURE: 'The callback is missing its full signature (ownertype and function name) ',
    CALLBACK_OWNER_TYPE_MISSING: 'No owner type maintained for callback',
    CALLBACK_PARAMETER_MISSING_NAME_OR_TYPE: 'Callback parameters must document type and name',
    CALLBACK_MISSING_IN_CODE: 'Documented callback not in source code',
    CALLBACK_ARGUMENTS_MISSMATCH:
        'Number of arguments in callback documentation does not match number of callback arguments in code'
} as const;

type ErrorKey = keyof typeof ERROR_TYPES;

interface HookState {
    node: CommentNode;
    hook: ControllerHook;
    errors: ErrorKey[];
}

/**
 * Builds the full error message for a given error key.
 *
 * @param type The error key to look up
 * @returns The full error message string
 */
function getMessage(type: ErrorKey): string {
    return `${ERROR_MSG}${ERROR_TYPES[type]}`;
}

/**
 * Resolves the rightmost method name from a call expression node.
 *
 * @param node The call expression node
 * @returns The rightmost method name or undefined
 */
function getRightestMethodName(node: SimpleCallExpression): string | undefined {
    const { callee } = node;
    if (callee.type === 'MemberExpression') {
        const prop = callee.property;
        return prop.type === 'Identifier' ? prop.name : undefined;
    }
    if (callee.type === 'Identifier') {
        return callee.name;
    }
    return undefined;
}

/**
 * Resolves the full qualified name for a call expression (e.g. `this.fnName` or `obj.fnName`).
 *
 * @param node The call expression node
 * @returns The full qualified name or undefined
 */
function getFunctionExpressionStatement(node: SimpleCallExpression): string | undefined {
    const fnName = getRightestMethodName(node);
    const { callee } = node;
    if (callee.type !== 'MemberExpression') {
        return fnName;
    }
    const { object } = callee as MemberExpression;
    if (object.type === 'ThisExpression') {
        return fnName ? `this.${fnName}` : undefined;
    }
    if (object.type === 'Identifier') {
        return fnName ? `${(object as Identifier).name}.${fnName}` : fnName;
    }
    return fnName;
}

/**
 * Updates hook state when the hook callback is found as a Property (implemented in code).
 *
 * @param hookState The current hook state
 * @param node The property node
 */
function matchImplementedControllerHookInCode(hookState: HookState, node: Property & Rule.NodeParentExtension): void {
    const commentEndLine = hookState.node.loc?.end.line ?? 0;
    if (node.loc!.start.line - commentEndLine < 1) {
        return;
    }
    hookState.errors = hookState.errors.filter((e) => e !== 'CALLBACK_MISSING_IN_CODE');
    const params = node.value.type === 'FunctionExpression' ? (node.value as { params: unknown[] }).params : [];
    if (
        params.length !== hookState.hook.getParameters().length &&
        !hookState.errors.includes('CALLBACK_ARGUMENTS_MISSMATCH')
    ) {
        hookState.errors.push('CALLBACK_ARGUMENTS_MISSMATCH');
    }
}

/**
 * Updates hook state when the hook callback is found as a CallExpression (called in code).
 *
 * @param hookState The current hook state
 * @param node The call expression node
 */
function matchCalledControllerHookInCode(
    hookState: HookState,
    node: SimpleCallExpression & Rule.NodeParentExtension
): void {
    const commentEndLine = hookState.node.loc?.end.line ?? 0;
    if (node.loc!.start.line < commentEndLine) {
        return;
    }
    hookState.errors = hookState.errors.filter((e) => e !== 'CALLBACK_MISSING_IN_CODE');
    if (
        node.arguments.length !== hookState.hook.getParameters().length &&
        !hookState.errors.includes('CALLBACK_ARGUMENTS_MISSMATCH')
    ) {
        hookState.errors.push('CALLBACK_ARGUMENTS_MISSMATCH');
    }
}

const rule: Rule.RuleModule = {
    meta: {
        type: 'suggestion',
        docs: {
            description: 'Validate @ControllerHook JSDoc callback signatures are well-formed and match source code.',
            recommended: true
        },
        messages: {
            badCallbackSignature: '{{errorMessage}}'
        },
        schema: []
    },
    create(context: Rule.RuleContext) {
        const analyzedHooks = new Map<CommentNode, HookState>();

        return {
            Program() {
                const comments = context.sourceCode.getAllComments().filter((c) => c.type === 'Block');

                for (const comment of comments) {
                    const hook = new ControllerHook(comment);
                    if (!hook.isControllerHook()) {
                        continue;
                    }

                    const hookState: HookState = {
                        node: comment,
                        hook,
                        errors: ['CALLBACK_MISSING_IN_CODE']
                    };

                    if (!hook.getCallbackName()) {
                        hookState.errors.pop();
                        hookState.errors.push('CALLBACK_MISSING_SIGNATURE');
                    }
                    if (!hook.getCallbackOwnerType()) {
                        hookState.errors.push('CALLBACK_OWNER_TYPE_MISSING');
                    }
                    for (const param of hook.getParameters()) {
                        if (param.name.length === 0 || param.type.length === 0) {
                            hookState.errors.push('CALLBACK_PARAMETER_MISSING_NAME_OR_TYPE');
                        }
                    }

                    analyzedHooks.set(comment, hookState);
                }
            },

            CallExpression(node: SimpleCallExpression & Rule.NodeParentExtension) {
                if (analyzedHooks.size === 0) {
                    return;
                }
                const fullName = getFunctionExpressionStatement(node);
                if (fullName === undefined) {
                    return;
                }
                const lastPart = fullName.split('.').pop();

                for (const hookState of analyzedHooks.values()) {
                    if (hookState.hook.getCallbackName() === lastPart) {
                        matchCalledControllerHookInCode(hookState, node);
                    }
                }
            },

            Property(node: Property & Rule.NodeParentExtension) {
                if (analyzedHooks.size === 0) {
                    return;
                }
                if (node.value.type !== 'FunctionExpression') {
                    return;
                }
                const fnName = node.key.type === 'Identifier' ? (node.key as Identifier).name : undefined;
                if (!fnName) {
                    return;
                }

                for (const hookState of analyzedHooks.values()) {
                    if (hookState.hook.getCallbackName() === fnName) {
                        matchImplementedControllerHookInCode(hookState, node);
                    }
                }
            },

            'Program:exit'() {
                for (const hookState of analyzedHooks.values()) {
                    for (const errorKey of hookState.errors) {
                        context.report({
                            node: hookState.node as unknown as Rule.Node,
                            messageId: 'badCallbackSignature',
                            data: { errorMessage: getMessage(errorKey) }
                        });
                    }
                }
            }
        };
    }
};

export default rule;
