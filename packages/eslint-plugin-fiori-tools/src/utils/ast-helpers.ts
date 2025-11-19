/**
 * Common AST helper functions for ESLint rules
 */

import type { Rule } from 'eslint';

// Type aliases for better readability
export type ASTNode = Rule.Node;

// ESLint AST node type interfaces - using intersections instead of extensions
interface BaseNode {
    type: string;
    parent?: ASTNode;
    range?: [number, number];
    loc?: {
        start: { line: number; column: number };
        end: { line: number; column: number };
    };
}

export type IdentifierNode = BaseNode & {
    type: 'Identifier';
    name: string;
};

export type MemberExpressionNode = BaseNode & {
    type: 'MemberExpression';
    object: unknown;
    property: unknown;
    computed: boolean;
    optional?: boolean;
};

export type LiteralNode = BaseNode & {
    type: 'Literal';
    value: string | number | boolean | null | RegExp;
    raw: string;
};

// ------------------------------------------------------------------------------
// Basic Type Checking Functions
// ------------------------------------------------------------------------------

/**
 * Check if a node is of a specific type
 *
 * @param node The AST node
 * @param type
 */
export function isType(node: unknown, type: string): boolean {
    return (node as BaseNode)?.type === type;
}

/**
 * Check if a node is an Identifier
 *
 * @param node The AST node
 */
export function isIdentifier(node: unknown): boolean {
    return isType(node, 'Identifier');
}

/**
 * Check if a node is a MemberExpression
 *
 * @param node The AST node
 */
export function isMember(node: unknown): boolean {
    return isType(node, 'MemberExpression');
}

/**
 * Check if a node is a CallExpression
 *
 * @param node The AST node
 */
export function isCall(node: unknown): boolean {
    return isType(node, 'CallExpression');
}

/**
 * Check if a node is a Literal
 *
 * @param node The AST node
 */
export function isLiteral(node: unknown): boolean {
    return isType(node, 'Literal');
}

/**
 * Check if a node is a Property
 *
 * @param node The AST node
 */
export function isProperty(node: unknown): boolean {
    return isType(node, 'Property');
}

/**
 * Check if a node is an ObjectExpression
 *
 * @param node The AST node
 */
export function isObject(node: unknown): boolean {
    return isType(node, 'ObjectExpression');
}

/**
 * Check if a node is an ArrayExpression
 *
 * @param node The AST node
 */
export function isArray(node: unknown): boolean {
    return isType(node, 'ArrayExpression');
}

// ------------------------------------------------------------------------------
// Array Utility Functions
// ------------------------------------------------------------------------------

/**
 * Check if an array contains an item
 *
 * @param array
 * @param item
 */
export function contains(array: string[], item: string): boolean {
    return array.includes(item);
}

// ------------------------------------------------------------------------------
// String Utility Functions
// ------------------------------------------------------------------------------

/**
 * Check if a value is a string
 *
 * @param value
 */
export function isString(value: unknown): value is string {
    return typeof value === 'string';
}

/**
 * Check if a string starts with a substring
 *
 * @param base
 * @param sub
 */
export function startsWith(base: string, sub: string): boolean {
    return base.indexOf(sub) === 0;
}

/**
 * Check if a string contains a substring
 *
 * @param str
 * @param substring
 */
export function containsString(str: string, substring: string): boolean {
    return str.indexOf(substring) >= 0;
}

// ------------------------------------------------------------------------------
// Window Object Detection Functions
// ------------------------------------------------------------------------------

/**
 * Check if a node represents the global 'window' variable
 *
 * @param node The AST node
 */
export function isWindow(node: unknown): boolean {
    return !!node && isIdentifier(node) && (node as IdentifierNode).name === 'window';
}

/**
 * Create a function to check if a node is the window object or a reference to it
 *
 * @param windowObjects
 */
export function createIsWindowObject(windowObjects: string[]): (node: unknown) => boolean {
    return function isWindowObject(node: unknown): boolean {
        return (
            isWindow(node) || (!!node && isIdentifier(node) && contains(windowObjects, (node as IdentifierNode).name))
        );
    };
}

/**
 * Create a function to remember window references
 *
 * @param windowObjects
 * @param isWindowObject
 */
export function createRememberWindow(
    windowObjects: string[],
    isWindowObject: (node: unknown) => boolean
): (left: unknown, right: unknown) => boolean {
    return function rememberWindow(left: unknown, right: unknown): boolean {
        if (isWindowObject(right as ASTNode) && isIdentifier(left as ASTNode)) {
            windowObjects.push((left as IdentifierNode).name);
            return true;
        }
        return false;
    };
}

// ------------------------------------------------------------------------------
// Document Object Detection Functions
// ------------------------------------------------------------------------------

/**
 * Create a function to check if a node represents the global 'document' variable
 *
 * @param isWindowObject
 */
export function createIsDocument(isWindowObject: (node: unknown) => boolean): (node: unknown) => boolean {
    return function isDocument(node: unknown): boolean {
        if (node) {
            if (isIdentifier(node)) {
                return (node as IdentifierNode).name === 'document';
            } else if (isMember(node)) {
                const memberNode = node as MemberExpressionNode;
                return isWindowObject(memberNode.object as ASTNode) && isDocument(memberNode.property as ASTNode);
            }
        }
        return false;
    };
}

/**
 * Create a function to check if a node is the document object or a reference to it
 *
 * @param documentObjects
 * @param isDocument
 */
export function createIsDocumentObject(
    documentObjects: string[],
    isDocument: (node: unknown) => boolean
): (node: unknown) => boolean {
    return function isDocumentObject(node: unknown): boolean {
        return (
            isDocument(node) ||
            (!!node && isIdentifier(node) && contains(documentObjects, (node as IdentifierNode).name))
        );
    };
}

/**
 * Create a function to remember document references
 *
 * @param documentObjects
 * @param isDocumentObject
 */
export function createRememberDocument(
    documentObjects: string[],
    isDocumentObject: (node: unknown) => boolean
): (left: unknown, right: unknown) => boolean {
    return function rememberDocument(left: unknown, right: unknown): boolean {
        if (isDocumentObject(right as ASTNode) && isIdentifier(left as ASTNode)) {
            documentObjects.push((left as IdentifierNode).name);
            return true;
        }
        return false;
    };
}

// ------------------------------------------------------------------------------
// AST Path Building Functions
// ------------------------------------------------------------------------------

/**
 * Build a path string from a callee node
 *
 * @param node The AST node
 */
export function buildCalleePath(node: unknown): string {
    const memberNode = node as MemberExpressionNode;
    if (isMember(memberNode.object)) {
        const objectNode = memberNode.object as MemberExpressionNode;
        const propertyName = isIdentifier(objectNode.property) ? (objectNode.property as IdentifierNode).name : '';
        return `${buildCalleePath(memberNode.object)}.${propertyName}`;
    } else if (isIdentifier(memberNode.object)) {
        return (memberNode.object as IdentifierNode).name;
    }
    return '';
}

/**
 * Convert a MemberExpression to a string representation
 *
 * @param node The AST node
 */
export function getMemberAsString(node: unknown): string {
    if (isMember(node)) {
        const memberNode = node as MemberExpressionNode;
        return `${getMemberAsString(memberNode.object)}.${getMemberAsString(memberNode.property)}`;
    } else if (isLiteral(node)) {
        return String((node as LiteralNode).value);
    } else if (isIdentifier(node)) {
        return (node as IdentifierNode).name;
    }
    return '';
}

// ------------------------------------------------------------------------------
// History Object Detection Functions
// ------------------------------------------------------------------------------

/**
 * Create a function to check if a node represents the 'history' object
 *
 * @param isWindowObject
 */
export function createIsHistory(isWindowObject: (node: unknown) => boolean): (node: unknown) => boolean {
    return function isHistory(node: unknown): boolean {
        if (node) {
            if (isIdentifier(node)) {
                return (node as IdentifierNode).name === 'history';
            } else if (isMember(node)) {
                const memberNode = node as MemberExpressionNode;
                return isWindowObject(memberNode.object as ASTNode) && isHistory(memberNode.property as ASTNode);
            }
        }
        return false;
    };
}

/**
 * Create a function to check if a node is the history object or a reference to it
 *
 * @param historyObjects
 * @param isHistory
 */
export function createIsHistoryObject(
    historyObjects: string[],
    isHistory: (node: unknown) => boolean
): (node: unknown) => boolean {
    return function isHistoryObject(node: unknown): boolean {
        return (
            isHistory(node) || (!!node && isIdentifier(node) && contains(historyObjects, (node as IdentifierNode).name))
        );
    };
}

/**
 * Create a function to remember history references
 *
 * @param historyObjects
 * @param isHistoryObject
 */
export function createRememberHistory(
    historyObjects: string[],
    isHistoryObject: (node: unknown) => boolean
): (left: unknown, right: unknown) => boolean {
    return function rememberHistory(left: unknown, right: unknown): boolean {
        if (isHistoryObject(right as ASTNode) && isIdentifier(left as ASTNode)) {
            historyObjects.push((left as IdentifierNode).name);
            return true;
        }
        return false;
    };
}

// ------------------------------------------------------------------------------
// Location Object Detection Functions
// ------------------------------------------------------------------------------

/**
 * Create a function to check if a node represents the 'location' object
 *
 * @param isWindowObject
 */
export function createIsLocation(isWindowObject: (node: unknown) => boolean): (node: unknown) => boolean {
    return function isLocation(node: unknown): boolean {
        if (node) {
            if (isIdentifier(node)) {
                return (node as IdentifierNode).name === 'location';
            } else if (isMember(node)) {
                const memberNode = node as MemberExpressionNode;
                return isWindowObject(memberNode.object as ASTNode) && isLocation(memberNode.property as ASTNode);
            }
        }
        return false;
    };
}

/**
 * Create a function to check if a node is the location object or a reference to it
 *
 * @param locationObjects
 * @param isLocation
 */
export function createIsLocationObject(
    locationObjects: string[],
    isLocation: (node: unknown) => boolean
): (node: unknown) => boolean {
    return function isLocationObject(node: unknown): boolean {
        return (
            isLocation(node) ||
            (!!node && isIdentifier(node) && contains(locationObjects, (node as IdentifierNode).name))
        );
    };
}

/**
 * Create a function to remember location references
 *
 * @param locationObjects
 * @param isLocationObject
 */
export function createRememberLocation(
    locationObjects: string[],
    isLocationObject: (node: unknown) => boolean
): (left: unknown, right: unknown) => boolean {
    return function rememberLocation(left: unknown, right: unknown): boolean {
        if (isLocationObject(right as ASTNode) && isIdentifier(left as ASTNode)) {
            locationObjects.push((left as IdentifierNode).name);
            return true;
        }
        return false;
    };
}

// ------------------------------------------------------------------------------
// Common Utility Functions for Rule Processing
// ------------------------------------------------------------------------------

/**
 * Get the literal or identifier name from a node
 *
 * @param node The AST node
 */
export function getLiteralOrIdentifierName(node: unknown): string {
    if (isIdentifier(node)) {
        return (node as IdentifierNode).name;
    } else if (isLiteral(node)) {
        return String((node as LiteralNode).value);
    }
    return '';
}

/**
 * Get the identifier path from a node, handling various node types
 *
 * @param node The AST node
 */
export function getIdentifierPath(node: unknown): string {
    if (!node) {
        return '';
    }

    const astNode = node as ASTNode;
    switch (astNode.type) {
        case 'Identifier':
            return (node as IdentifierNode).name;
        case 'MemberExpression':
            const memberNode = node as MemberExpressionNode;
            return `${getIdentifierPath(memberNode.object)}.${getLiteralOrIdentifierName(memberNode.property)}`;
        case 'NewExpression':
            return getIdentifierPath((node as any).callee);
        case 'CallExpression':
            return `${getIdentifierPath((node as any).callee)}().`;
        default:
            return '';
    }
}

/**
 * Resolve identifier path by substituting known variables
 *
 * @param path The path to resolve
 * @param variables The variables lookup object
 */
export function resolveIdentifierPath(path: string, variables: Record<string, string[]>): string {
    const parts = path.split('.');
    let substitution: string | undefined;

    // Check if current identifier is remembered as an interesting variable
    for (const name in variables) {
        if (name === parts[0]) {
            // Get last stored variable value
            substitution = variables[name].at(-1);
        }
    }

    // If so, replace current identifier with its value
    if (substitution) {
        parts[0] = substitution;
        path = parts.join('.');
    }

    return path;
}

/**
 * Remember interesting variable for later resolution
 *
 * @param node The variable declarator node
 * @param name The name to remember
 * @param variables The variables lookup object
 */
export function rememberInterestingVariable(node: unknown, name: string, variables: Record<string, string[]>): void {
    const declaratorNode = node as unknown as { id: { name: string } };
    if (typeof variables[declaratorNode.id.name] === 'undefined') {
        variables[declaratorNode.id.name] = [];
    }
    variables[declaratorNode.id.name].push(name);
}

/**
 * Check if a path is interesting based on a given criteria function
 *
 * @param path The path to check
 * @param interestingPathChecker Function to determine if path is interesting
 */
export function checkInterestingPath(path: string, interestingPathChecker: (path: string) => boolean): boolean {
    return interestingPathChecker(path);
}

/**
 * Create a generic variable declarator processor
 *
 * @param variables The variables lookup object
 * @param interestingPathChecker Function to determine if path is interesting
 */
export function createVariableDeclaratorProcessor(
    variables: Record<string, string[]>,
    interestingPathChecker: (path: string) => boolean
): (node: unknown) => void {
    return function processVariableDeclarator(node: unknown): void {
        const declaratorNode = node as unknown as { init?: unknown };
        let path = getIdentifierPath(declaratorNode.init);
        path = resolveIdentifierPath(path, variables);

        // If declaration is interesting, remember identifier and resolved value
        if (checkInterestingPath(path, interestingPathChecker)) {
            rememberInterestingVariable(node, path, variables);
        }
    };
}

/**
 * Check if an identifier has an underscore prefix (indicating private)
 *
 * @param identifier The identifier to check
 */
export function hasUnderscore(identifier: string): boolean {
    return identifier !== '_' && identifier[0] === '_';
}

/**
 * Check if a value is an integer
 *
 * @param value The value to check
 */
export function isInteger(value: number): boolean {
    return Number(value) === value && value % 1 === 0;
}

/**
 * Check if a string ends with a specific substring
 *
 * @param str The string to check
 * @param suffix The suffix to look for
 */
export function endsWith(str: string, suffix: string): boolean {
    return typeof str === 'string' && typeof suffix === 'string' && str.endsWith(suffix);
}
