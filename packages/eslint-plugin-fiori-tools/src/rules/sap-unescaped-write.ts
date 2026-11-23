/**
 * @file Detect unescaped write() and writeAttribute() calls in UI5 renderers (potential XSS)
 */

import type { Rule } from 'eslint';
import type {
    Property,
    AssignmentExpression,
    FunctionExpression,
    ExpressionStatement,
    CallExpression,
    Expression,
    Identifier
} from 'estree';

// ------------------------------------------------------------------------------
// Helper Functions
// ------------------------------------------------------------------------------

/**
 * Get the rightmost method name from a call expression node.
 *
 * @param node The call expression node
 * @returns The rightmost method name or empty string
 */
function getRightestMethodName(node: CallExpression): string {
    const { callee } = node;
    if (callee.type === 'MemberExpression') {
        const prop = callee.property;
        return prop.type === 'Identifier' ? prop.name : '';
    }
    if (callee.type === 'Identifier') {
        return callee.name;
    }
    return '';
}

/**
 * Build a string like "orm.write" from a call expression node.
 *
 * @param node The call expression node
 * @returns The full function expression string or empty string
 */
function getFunctionExpressionStatement(node: CallExpression): string {
    const fnName = getRightestMethodName(node);
    const { callee } = node;
    if (callee.type === 'MemberExpression' && callee.object.type === 'Identifier') {
        return `${(callee.object as Identifier).name}.${fnName}`;
    }
    return '';
}

/**
 * Check if a write() call is safe (argument must be a Literal).
 *
 * @param node The call expression node
 * @returns True if safe
 */
function validateWrite(node: CallExpression): boolean {
    if (node.arguments.length === 0) {
        return true;
    }
    return node.arguments[0].type === 'Literal';
}

/**
 * Check if a writeAttribute() call is safe (second arg must be Literal or Identifier).
 *
 * @param node The call expression node
 * @returns True if safe
 */
function validateWriteAttribute(node: CallExpression): boolean {
    if (node.arguments.length < 2) {
        return true;
    }
    const secondArg = node.arguments[1];
    return secondArg.type === 'Literal' || secondArg.type === 'Identifier';
}

/**
 * Dispatch validation to the correct validator based on the call expression.
 *
 * @param node The call expression node
 * @param writeExpr The expected write expression string
 * @returns True if the call is safe
 */
function validate(node: CallExpression, writeExpr: string): boolean {
    const expr = getFunctionExpressionStatement(node);
    if (expr === writeExpr) {
        return validateWrite(node);
    }
    return validateWriteAttribute(node);
}

/**
 * Filter body statements to only those that are write/writeAttribute calls.
 *
 * @param stmts The function body statements
 * @param writeExpr The expected write call string
 * @param writeAttrExpr The expected writeAttribute call string
 * @returns Filtered expression statements that are write calls
 */
function filterWriteExpressions(
    stmts: ExpressionStatement[],
    writeExpr: string,
    writeAttrExpr: string
): ExpressionStatement[] {
    return stmts.filter((e) => {
        const { expression } = e;
        if (expression?.type !== 'CallExpression') {
            return false;
        }
        const call = getFunctionExpressionStatement(expression as CallExpression);
        return writeExpr === call || writeAttrExpr === call;
    });
}

// ------------------------------------------------------------------------------
// Rule Definition
// ------------------------------------------------------------------------------
const rule: Rule.RuleModule = {
    meta: {
        type: 'problem',
        docs: {
            description: 'Detect unescaped `write()` and `writeAttribute()` calls in UI5 renderers (potential XSS).',
            recommended: true
        },
        messages: {
            unescapedWrite: 'Avoid the use of unescaped write (potential XSS issue)'
        },
        schema: []
    },
    create(context: Rule.RuleContext) {
        const RENDERER = 'renderer';
        const RENDER = 'render';

        /**
         * Validate all write/writeAttribute calls in the given function body.
         *
         * @param expressions The function body statement list
         * @param orm The render manager parameter name
         */
        function executeValidation(expressions: ExpressionStatement[], orm: string): void {
            const writeExpr = `${orm}.write`;
            const writeAttrExpr = `${orm}.writeAttribute`;
            const calls = filterWriteExpressions(expressions, writeExpr, writeAttrExpr);
            for (const call of calls) {
                const callExpr = call.expression as CallExpression;
                if (!validate(callExpr, writeExpr)) {
                    context.report({ node: callExpr as unknown as Rule.Node, messageId: 'unescapedWrite' });
                }
            }
        }

        /**
         * Handle a FunctionExpression that is a renderer, validating its write calls.
         *
         * @param fn The FunctionExpression node
         */
        function handleRendererFunction(fn: Expression): void {
            if (fn.type !== 'FunctionExpression') {
                return;
            }
            const funcExpr = fn as FunctionExpression;
            if (funcExpr.params.length === 0) {
                return;
            }
            const firstParam = funcExpr.params[0];
            if (firstParam.type !== 'Identifier') {
                return;
            }
            const orm = (firstParam as Identifier).name;
            const stmts = funcExpr.body.body.filter((s): s is ExpressionStatement => s.type === 'ExpressionStatement');
            executeValidation(stmts, orm);
        }

        return {
            Property(node: Property & Rule.NodeParentExtension): void {
                const key = node.key;
                const keyName = key.type === 'Identifier' ? (key as Identifier).name : undefined;
                if (keyName === RENDERER || keyName === RENDER) {
                    handleRendererFunction(node.value as Expression);
                }
            },
            AssignmentExpression(node: AssignmentExpression & Rule.NodeParentExtension): void {
                const { left } = node;
                if (left.type !== 'MemberExpression') {
                    return;
                }
                const prop = left.property;
                const propName = prop.type === 'Identifier' ? (prop as Identifier).name : undefined;
                if (propName === RENDERER || propName === RENDER) {
                    handleRendererFunction(node.right);
                }
            }
        };
    }
};

export default rule;
