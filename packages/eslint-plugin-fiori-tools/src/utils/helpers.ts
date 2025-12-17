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
 * Check if a node is of a specific type.
 *
 * @param node The AST node
 * @param type The type to check for
 * @returns True if the node is of the specified type
 */
export function isType(node: unknown, type: string): boolean {
    return (node as BaseNode)?.type === type;
}

/**
 * Check if a node is an Identifier.
 *
 * @param node The AST node
 * @returns True if the node is an Identifier
 */
export function isIdentifier(node: unknown): boolean {
    return isType(node, 'Identifier');
}

/**
 * Check if a node is a MemberExpression.
 *
 * @param node The AST node
 * @returns True if the node is a MemberExpression
 */
export function isMember(node: unknown): boolean {
    return isType(node, 'MemberExpression');
}

/**
 * Check if a node is a CallExpression.
 *
 * @param node The AST node
 * @returns True if the node is a CallExpression
 */
export function isCall(node: unknown): boolean {
    return isType(node, 'CallExpression');
}

/**
 * Check if a node is a Literal.
 *
 * @param node The AST node
 * @returns True if the node is a Literal
 */
export function isLiteral(node: unknown): boolean {
    return isType(node, 'Literal');
}

/**
 * Check if a node is a Property.
 *
 * @param node The AST node
 * @returns True if the node is a Property
 */
export function isProperty(node: unknown): boolean {
    return isType(node, 'Property');
}

/**
 * Check if a node is an ObjectExpression.
 *
 * @param node The AST node
 * @returns True if the node is an ObjectExpression
 */
export function isObject(node: unknown): boolean {
    return isType(node, 'ObjectExpression');
}

/**
 * Check if a node is an ArrayExpression.
 *
 * @param node The AST node
 * @returns True if the node is an ArrayExpression
 */
export function isArray(node: unknown): boolean {
    return isType(node, 'ArrayExpression');
}

// ------------------------------------------------------------------------------
// Array Utility Functions
// ------------------------------------------------------------------------------

/**
 * Check if an array contains an item.
 *
 * @param array The array to search in
 * @param item The item to search for
 * @returns True if the array contains the item
 */
export function contains(array: string[], item: string): boolean {
    return array.includes(item);
}

// ------------------------------------------------------------------------------
// String Utility Functions
// ------------------------------------------------------------------------------

/**
 * Check if a value is a string.
 *
 * @param value The value to check
 * @returns True if the value is a string
 */
export function isString(value: unknown): value is string {
    return typeof value === 'string';
}

/**
 * Check if a string starts with a substring.
 *
 * @param base The base string to check
 * @param sub The substring to look for at the start
 * @returns True if the base string starts with the substring
 */
export function startsWith(base: string, sub: string): boolean {
    return base.indexOf(sub) === 0;
}

/**
 * Check if a string contains a substring.
 *
 * @param str The string to search in
 * @param substring The substring to search for
 * @returns True if the string contains the substring
 */
export function containsString(str: string, substring: string): boolean {
    return str.indexOf(substring) >= 0;
}

// ------------------------------------------------------------------------------
// Window Object Detection Functions
// ------------------------------------------------------------------------------

/**
 * Check if a node represents the global 'window' variable.
 *
 * @param node The AST node
 * @returns True if the node represents the global window variable
 */
export function isWindow(node: unknown): boolean {
    return !!node && isIdentifier(node) && (node as IdentifierNode).name === 'window';
}

/**
 * Create a function to check if a node is the window object or a reference to it.
 *
 * @param windowObjects Array of window object names to check against
 * @returns Function that checks if a node is a window object or reference
 */
export function createIsWindowObject(windowObjects: string[]): (node: unknown) => boolean {
    return function isWindowObject(node: unknown): boolean {
        return (
            isWindow(node) || (!!node && isIdentifier(node) && contains(windowObjects, (node as IdentifierNode).name))
        );
    };
}

/**
 * Create a function to remember window references.
 *
 * @param windowObjects Array to store window object names
 * @param isWindowObject Function to check if a node is a window object
 * @returns Function that remembers window object references
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
 * Create a function to check if a node represents the global 'document' variable.
 *
 * @param isWindowObject Function to check if a node is a window object
 * @returns Function that checks if a node represents the document object
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
 * Create a function to check if a node is the document object or a reference to it.
 *
 * @param documentObjects Array to store document object names
 * @param isDocument Function to check if a node is a document object
 * @returns Function that checks if a node is a document object or reference
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
 * Create a function to remember document references.
 *
 * @param documentObjects Array to store document object names
 * @param isDocumentObject Function to check if a node is a document object
 * @returns Function that remembers document object references
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
 * Build a path string from a callee node.
 *
 * @param node The AST node
 * @returns String representation of the callee path
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
 * Convert a MemberExpression to a string representation.
 *
 * @param node The AST node
 * @returns String representation of the member expression
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
 * Create a function to check if a node represents the 'history' object.
 *
 * @param isWindowObject Function to check if a node is a window object
 * @returns Function that checks if a node represents the history object
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
 * Create a function to check if a node is the history object or a reference to it.
 *
 * @param historyObjects Array to store history object names
 * @param isHistory Function to check if a node is a history object
 * @returns Function that checks if a node is a history object or reference
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
 * Create a function to remember history references.
 *
 * @param historyObjects Array to store history object names
 * @param isHistoryObject Function to check if a node is a history object
 * @returns Function that remembers history object references
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
 * Create a function to check if a node represents the 'location' object.
 *
 * @param isWindowObject Function to check if a node is a window object
 * @returns Function that checks if a node represents the location object
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
 * Create a function to check if a node is the location object or a reference to it.
 *
 * @param locationObjects Array to store location object names
 * @param isLocation Function to check if a node is a location object
 * @returns Function that checks if a node is a location object or reference
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
 * Create a function to remember location references.
 *
 * @param locationObjects Array to store location object names
 * @param isLocationObject Function to check if a node is a location object
 * @returns Function that remembers location object references
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
 * Get the literal or identifier name from a node.
 *
 * @param node The AST node
 * @returns The name or value as a string
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
 * Get the identifier path from a node, handling various node types.
 *
 * @param node The AST node
 * @returns The identifier path as a string
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
 * Resolve identifier path by substituting known variables.
 *
 * @param path The path to resolve
 * @param variables The variables lookup object
 * @returns The resolved path with substitutions applied
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
 * Remember interesting variable for later resolution.
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
 * Check if a path is interesting based on a given criteria function.
 *
 * @param path The path to check
 * @param interestingPathChecker Function to determine if path is interesting
 * @returns True if the path is considered interesting
 */
export function checkInterestingPath(path: string, interestingPathChecker: (path: string) => boolean): boolean {
    return interestingPathChecker(path);
}

/**
 * Create a generic variable declarator processor.
 *
 * @param variables The variables lookup object
 * @param interestingPathChecker Function to determine if path is interesting
 * @returns Function that processes variable declarator nodes
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
 * Check if an identifier has an underscore prefix (indicating private).
 *
 * @param identifier The identifier to check
 * @returns True if the identifier has an underscore prefix
 */
export function hasUnderscore(identifier: string): boolean {
    return identifier !== '_' && identifier[0] === '_';
}

/**
 * Check if a value is an integer.
 *
 * @param value The value to check
 * @returns True if the value is an integer
 */
export function isInteger(value: number): boolean {
    return Number(value) === value && value % 1 === 0;
}

/**
 * Check if a string ends with a specific substring.
 *
 * @param str The string to check
 * @param suffix The suffix to look for
 * @returns True if the string ends with the suffix
 */
export function endsWith(str: string, suffix: string): boolean {
    return typeof str === 'string' && typeof suffix === 'string' && str.endsWith(suffix);
}

/**
 * Get the last element of a dot-separated path.
 *
 * @param calleePath The path to extract from
 * @returns The last element of the path
 */
export function isForbiddenObviousApi(calleePath: string): string {
    const elementArray = calleePath.split('.');
    return elementArray.at(-1) ?? '';
}

// ------------------------------------------------------------------------------
// Object Path Finding Utilities
// ------------------------------------------------------------------------------

/**
 * Filter predicate for path segments.
 * @param value The value at the current path segment
 * @param key The key/property name of the current segment
 * @param path The current path array leading to this segment
 * @param context Optional external context object passed from the caller
 * @returns Metadata object if this segment matches, undefined otherwise
 */
export type PathSegmentFilter<TContext = any> = (
    value: unknown,
    key: string,
    path: string[],
    context?: TContext
) => Record<string, any> | undefined;

/**
 * Result of a path search operation.
 */
export interface PathMatch {
    /** The complete path array to the matched location */
    path: string[];
    /** The value at the matched path */
    value: unknown;
    /** Map of wildcard names to their matched keys (e.g., {'targetName': 'BookingList'}) */
    wildcardValues: Record<string, string>;
    /** Optional metadata attached by filter predicates (e.g., computed values) */
    metadata?: Record<string, any>;
}

/**
 * Find all paths in a nested object matching a path template with wildcards and filters.
 * 
 * This function traverses a nested object structure and finds all paths that match
 * a given template. The template can include:
 * - Static segments: exact property names that must match
 * - Wildcard segments: named wildcards like '{targetName}' that match any key
 * - Optional segments: segments ending with '?' that may be missing
 * 
 * Filters can be applied to wildcard segments to constrain which keys are matched.
 * 
 * @example
 * ```typescript
 * const manifest = {
 *   'sap.ui5': {
 *     routing: {
 *       targets: {
 *         'BookingList': { type: 'Component', name: 'sap.fe.templates.ListReport' },
 *         'DetailPage': { type: 'Component', name: 'sap.fe.templates.ObjectPage' }
 *       }
 *     }
 *   }
 * };
 * 
 * const matches = findPathsInObject(
 *   manifest,
 *   ['sap.ui5', 'routing', 'targets', '{targetName}', 'tableSettings?', 'widthIncludingColumnHeader?'],
 *   {
 *     targetName: (value, key, path, ctx) => {
 *       if (value?.type !== 'Component') return undefined;
 *       if (value?.name !== 'sap.fe.templates.ListReport') return undefined;
 *       // Access external context and return metadata
 *       const entitySet = value.options?.settings?.entitySet;
 *       const fqn = ctx?.indexedService?.entitySets[entitySet]?.structuredType;
 *       return fqn ? { fullyQualifiedName: fqn } : undefined;
 *     }
 *   },
 *   { indexedService: myService }
 * );
 * // Returns matches at any depth: full path if widthIncludingColumnHeader exists,
 * // up to tableSettings if it exists, or just up to targetName
 * ```
 * 
 * @param obj The object to traverse
 * @param pathTemplate Array representing the path template (e.g., ['sap.ui5', 'routing', 'targets', '*'])
 * @param filters Optional map of wildcard names/indices to filter predicates
 * @param context Optional external context object passed to filter predicates
 * @param basePath Starting path (used internally for recursion)
 * @returns Array of matching path results
 */
export function findPathsInObject<TContext = any>(
    obj: unknown,
    pathTemplate: string[],
    filters: Record<string, PathSegmentFilter<TContext>> = {},
    context?: TContext,
    basePath: string[] = []
): PathMatch[] {
    // Base case: if template is empty, we've matched the complete path
    if (pathTemplate.length === 0) {
        return [{
            path: basePath,
            value: obj,
            wildcardValues: {},
            metadata: {}
        }];
    }
    
    // Handle null/undefined/non-objects
    if (obj == null || typeof obj !== 'object' || Array.isArray(obj)) {
        return [];
    }
    
    const typedObj = obj as Record<string, unknown>;
    const [currentSegment, ...remainingTemplate] = pathTemplate;
    
    // Parse segment modifiers
    const isOptional = currentSegment.endsWith('?');
    const segmentWithoutOptional = isOptional ? currentSegment.slice(0, -1) : currentSegment;
    const isWildcard = segmentWithoutOptional.startsWith('{') && segmentWithoutOptional.endsWith('}');
    const wildcardName = isWildcard ? segmentWithoutOptional.slice(1, -1) : segmentWithoutOptional;
    
    // Check if property exists
    const hasProperty = isWildcard ? Object.keys(typedObj).length > 0 : (segmentWithoutOptional in typedObj);
    
    // If optional and property doesn't exist, return current position as match
    if (isOptional && !hasProperty) {
        return [{
            path: basePath,
            value: obj,
            wildcardValues: {},
            metadata: {}
        }];
    }
    
    // If required and property doesn't exist, no match
    if (!isOptional && !hasProperty && !isWildcard) {
        return [];
    }
    
    const results: PathMatch[] = [];
    
    if (isWildcard) {
        // Wildcard: try all properties of the current object
        const filter = filters[wildcardName];
        
        for (const [key, value] of Object.entries(typedObj)) {
            let filterMetadata: Record<string, any> | undefined;
            
            // Apply filter if provided - returns metadata or undefined
            if (filter) {
                filterMetadata = filter(value, key, [...basePath, key], context);
                
                // Skip if filter returned undefined (no match)
                if (filterMetadata === undefined) {
                    continue;
                }
            }
            
            // Recursively search remaining template
            const subResults = findPathsInObject(
                value,
                remainingTemplate,
                filters,
                context,
                [...basePath, key]
            );
            
            // Merge wildcard values and metadata
            for (const result of subResults) {
                results.push({
                    ...result,
                    wildcardValues: {
                        [wildcardName]: key,
                        ...result.wildcardValues
                    },
                    metadata: {
                        ...filterMetadata,
                        ...result.metadata
                    }
                });
            }
        }
    } else {
        // Static segment: recurse into the property
        const subResults = findPathsInObject(
            typedObj[segmentWithoutOptional],
            remainingTemplate,
            filters,
            context,
            [...basePath, segmentWithoutOptional]
        );
        results.push(...subResults);
    }
    
    return results;
}
