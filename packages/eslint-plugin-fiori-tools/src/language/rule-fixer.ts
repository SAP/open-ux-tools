import type { JSONRuleContext } from './rule-factory';
import type { MemberNode, ObjectNode } from '@humanwhocodes/momoa';
import type { DeepestExistingPathResult } from '../utils/helpers';
import type { RuleTextEdit, RuleTextEditor } from '@eslint/core';

/**
 * Configuration for creating a JSON fixer.
 */
export interface JsonFixerConfig<MessageIds extends string, RuleOptions extends unknown[]> {
    /**
     * The ESLint rule context.
     */
    context: JSONRuleContext<MessageIds, RuleOptions>;

    /**
     * The MemberNode representing the deepest valid path in the JSON structure.
     */
    node: MemberNode;

    /**
     * The result from finding the deepest existing path in the manifest.
     */
    deepestPathResult: DeepestExistingPathResult;

    /**
     * The value to set. If undefined, the property will be deleted.
     * Can be a primitive value, an object, or an array.
     */
    value?: string | number | boolean | null | Record<string, unknown> | unknown[];

    /**
     * The operation to perform: 'insert', 'update', or 'delete'.
     * If not specified, it will be inferred based on the context.
     */
    operation?: 'insert' | 'update' | 'delete';
}

/**
 * Creates a fixer function for JSON modifications based on path analysis.
 *
 * This generic function handles three types of operations:
 * 1. **Insert**: Creates missing path segments and sets a value.
 * 2. **Update**: Modifies an existing value at a complete path.
 * 3. **Delete**: Removes a property from the JSON structure.
 *
 * The operation is determined by:
 * - If `missingSegments.length > 0`: INSERT operation (path doesn't fully exist).
 * - If `missingSegments.length === 0` and `value !== undefined`: UPDATE operation.
 * - If `missingSegments.length === 0` and `value === undefined`: DELETE operation.
 *
 * @example
 * // Update an existing boolean property
 * fix: createJsonFixer({
 *   value: true,
 *   context,
 *   deepestPathResult: paths,
 *   node
 * })
 * @example
 * // Insert a new nested property path
 * fix: createJsonFixer({
 *   value: { name: 'NewRow' },
 *   context,
 *   deepestPathResult: {
 *     validPath: ['sap.ui5', 'routing'],
 *     missingSegments: ['targets', 'IncidentsObjectPage', 'options']
 *   },
 *   node
 * })
 * @example
 * // Delete a property
 * fix: createJsonFixer({
 *   value: undefined,
 *   context,
 *   deepestPathResult: paths,
 *   node,
 *   operation: 'delete'
 * })
 * @template MessageIds - Union type of message IDs used in the rule.
 * @template RuleOptions - Array type of rule option values.
 * @param config - Configuration object for the fixer.
 * @returns A fixer function compatible with ESLint's fix mechanism, or undefined if no fix is possible.
 */
export function createJsonFixer<MessageIds extends string, RuleOptions extends unknown[]>(
    config: JsonFixerConfig<MessageIds, RuleOptions>
): ((fixer: RuleTextEditor) => RuleTextEdit | Iterable<RuleTextEdit>) | undefined {
    const { node, deepestPathResult, value, operation, context } = config;
    const { missingSegments } = deepestPathResult;

    // Determine the operation if not explicitly provided
    let fixOperation = operation;
    if (!fixOperation) {
        if (missingSegments.length > 0) {
            fixOperation = 'insert';
        } else if (value !== undefined) {
            fixOperation = 'update';
        } else {
            fixOperation = 'delete';
        }
    }

    return (fixer: RuleTextEditor) => {
        try {
            switch (fixOperation) {
                case 'update': {
                    const result = handleUpdate(fixer, node, value);
                    return result ? [result] : [];
                }

                case 'insert': {
                    const result = handleInsert(fixer, node, missingSegments, value);
                    return result ? [result] : [];
                }

                case 'delete': {
                    const result = handleDelete(fixer, node, context);
                    if (!result) {
                        return [];
                    }
                    return Array.isArray(result) ? result : [result];
                }

                default:
                    return [];
            }
        } catch {
            return [];
        }
    };
}

/**
 * Handles the UPDATE operation - modifies an existing value.
 *
 * @param fixer - The ESLint fixer object
 * @param node - The MemberNode at the deepest valid path
 * @param value - The new value to set
 * @returns Fixer result or undefined if no fix is possible
 */
function handleUpdate(
    fixer: RuleTextEditor,
    node: MemberNode,
    value: string | number | boolean | null | undefined | Record<string, unknown> | unknown[]
): RuleTextEdit | undefined {
    if (!node.value) {
        return undefined;
    }

    // Determine the range to replace
    const range = node.value.range ?? [node.value.loc.start.offset, node.value.loc.end.offset];

    // Format the new value based on its type
    const newValueText = formatJsonValue(value);

    return fixer.replaceTextRange(range, newValueText);
}

/**
 * Handles the INSERT operation - creates missing path segments and sets a value.
 *
 * For example, if we need to insert:
 * ['targets', 'IncidentsObjectPage', 'options', 'settings', 'controlConfiguration'].
 *
 * We'll build nested objects like:
 * "targets": {
 *   "IncidentsObjectPage": {
 *     "options": {
 *       "settings": {
 *         "controlConfiguration": { ... }
 *       }
 *     }
 *   }
 * }.
 *
 * @param fixer - The ESLint fixer object
 * @param node - The MemberNode at the deepest valid path
 * @param missingSegments - Array of path segments that need to be created
 * @param value - The value to set at the end of the path
 * @returns Fixer result or undefined if no fix is possible
 */
function handleInsert(
    fixer: RuleTextEditor,
    node: MemberNode,
    missingSegments: string[],
    value: string | number | boolean | null | undefined | Record<string, unknown> | unknown[]
): RuleTextEdit | undefined {
    if (missingSegments.length === 0) {
        return undefined;
    }

    // Find the insertion point - the value of the node (should be an object)
    if (node.value.type !== 'Object') {
        return undefined;
    }

    // Calculate indentation based on the node's location
    const baseIndent = node.name.loc.start.column - 1; // Columns are 1-based
    const indentSize = 2; // Standard JSON indent
    const currentIndent = baseIndent + indentSize;

    // Build the nested structure for missing segments
    const newContent = buildNestedJson(missingSegments, value, currentIndent, indentSize);

    // Determine insertion position
    const valueOffset = node.value.loc.start.offset + 1; // After the opening '{'

    // Check if the object is empty or has existing properties
    const isEmpty = node.value.members?.length === 0;

    let textToInsert: string;
    if (isEmpty) {
        // Empty object - insert without trailing comma
        textToInsert = `\n${newContent}`;
    } else {
        // Has existing properties - insert with trailing comma
        textToInsert = `\n${newContent},`;
    }

    return fixer.insertTextBeforeRange([valueOffset, valueOffset], textToInsert);
}

/**
 * Handles the DELETE operation - removes a property from the JSON structure.
 * Deletes the complete line including leading whitespace, the property with its value,
 * and handles comma removal based on whether the property is last in the object.
 *
 * Behavior:
 * - If deleting the last property: removes the preceding comma from the previous property
 * - If deleting a middle property: removes the trailing comma from the current property
 *
 * Supports:
 * - Deletion of a property with primitive or object value
 * - Deletion of an object with all its properties
 * - Multi-line values (e.g., objects spanning multiple lines)
 *
 * Out of scope:
 * - Deletion of array values
 *
 * @param fixer - The ESLint fixer object.
 * @param node - The MemberNode to delete.
 * @param context - The rule context to access source code text and find parent object.
 * @returns Fixer result (single or multiple edits) or undefined if no fix is possible.
 */
function handleDelete<MessageIds extends string, RuleOptions extends unknown[]>(
    fixer: RuleTextEditor,
    node: MemberNode,
    context: JSONRuleContext<MessageIds, RuleOptions>
): RuleTextEdit | RuleTextEdit[] | undefined {
    if (!node.name || !node.value) {
        return undefined;
    }

    const sourceCode = context.sourceCode.text;
    const startOffset = node.name.loc.start.offset;
    const endOffset = node.value.loc.end.offset;

    // Find the parent object by locating the nearest enclosing object in the AST
    // We need to traverse the AST from the root to find the parent containing this member
    const parentObject = findParentObject(context.sourceCode.ast.body, node);
    const parentMembers = parentObject?.members ?? [];
    const nodeIndex = parentMembers.findIndex(
        (member: MemberNode) =>
            member.name.loc.start.offset === startOffset && member.value.loc.end.offset === endOffset
    );
    const isLastProperty = nodeIndex !== -1 && nodeIndex === parentMembers.length - 1;

    // Find the start of the line where the property name begins (including leading whitespace)
    let lineStartOffset = startOffset;
    while (lineStartOffset > 0 && sourceCode[lineStartOffset - 1] !== '\n') {
        lineStartOffset--;
    }

    // Find the end of deletion
    let deleteEndOffset = endOffset;

    if (isLastProperty && nodeIndex > 0) {
        // This is the last property - we need to remove the trailing comma from the previous property
        const previousNode = parentMembers[nodeIndex - 1];
        const previousValueEnd = previousNode.value.loc.end.offset;

        // Find the comma after the previous property's value
        let commaOffset = -1;
        for (let i = previousValueEnd; i < startOffset; i++) {
            if (sourceCode[i] === ',') {
                commaOffset = i;
                break;
            }
        }

        // Extend deletion to include newline after current property if present
        for (let i = endOffset; i < sourceCode.length; i++) {
            const char = sourceCode[i];
            if (char === '\n') {
                deleteEndOffset = i + 1;
                break;
            } else if (/\s/.test(char)) {
                deleteEndOffset = i + 1;
            } else {
                break;
            }
        }

        // Return multiple edits: remove the comma from previous line and remove current line
        if (commaOffset !== -1) {
            return [
                fixer.removeRange([commaOffset, commaOffset + 1]),
                fixer.removeRange([lineStartOffset, deleteEndOffset])
            ];
        }
    } else {
        // Not the last property - include trailing comma and newline after the value
        for (let i = endOffset; i < sourceCode.length; i++) {
            const char = sourceCode[i];
            if (char === '\n') {
                deleteEndOffset = i + 1;
                break;
            } else if (char === ',' || /\s/.test(char)) {
                deleteEndOffset = i + 1;
            } else {
                // Hit a non-whitespace, non-comma character - stop here
                break;
            }
        }
    }

    return fixer.removeRange([lineStartOffset, deleteEndOffset]);
}

/**
 * Recursively searches for the parent ObjectNode containing the specified MemberNode.
 *
 * @param node - The current node to search
 * @param targetMember - The MemberNode we're looking for the parent of
 * @returns The parent ObjectNode if found, undefined otherwise
 */
function findParentObject(node: ObjectNode | any, targetMember: MemberNode): ObjectNode | undefined {
    if (!node) {
        return undefined;
    }

    // If this node is an Object with members, check if it contains our target member
    if (node.type === 'Object' && node.members) {
        for (const member of node.members as MemberNode[]) {
            if (
                member.name.loc.start.offset === targetMember.name.loc.start.offset &&
                member.value.loc.end.offset === targetMember.value.loc.end.offset
            ) {
                return node;
            }
        }

        // Recursively search in member values
        for (const member of node.members as MemberNode[]) {
            const found = findParentObject(member.value, targetMember);
            if (found) {
                return found;
            }
        }
    }

    // Handle Array type
    if (node.type === 'Array' && node.elements) {
        for (const element of node.elements as any[]) {
            const found = findParentObject(element, targetMember);
            if (found) {
                return found;
            }
        }
    }

    return undefined;
}

/**
 * Builds nested JSON structure from path segments.
 *
 * @param segments - Array of path segments to create
 * @param value - The final value to set
 * @param currentIndent - Current indentation level (in spaces)
 * @param indentSize - Size of each indentation level
 * @returns Formatted JSON string
 */
function buildNestedJson(
    segments: string[],
    value: string | number | boolean | null | undefined | Record<string, unknown> | unknown[],
    currentIndent: number,
    indentSize: number
): string {
    if (segments.length === 0) {
        return formatJsonValue(value);
    }

    const [firstSegment, ...restSegments] = segments;
    const indent = ' '.repeat(currentIndent);

    if (restSegments.length === 0) {
        // Last segment - set the value
        const formattedValue = formatJsonValue(value);
        return `${indent}"${firstSegment}": ${formattedValue}`;
    } else {
        // Intermediate segment - create nested object
        const nestedContent = buildNestedJson(restSegments, value, currentIndent + indentSize, indentSize);
        return `${indent}"${firstSegment}": {\n${nestedContent}\n${indent}}`;
    }
}

/**
 * Formats a JavaScript value as JSON text.
 *
 * @param value - The value to format
 * @returns Formatted JSON string
 */
function formatJsonValue(
    value: string | number | boolean | null | undefined | Record<string, unknown> | unknown[]
): string {
    if (value === null) {
        return 'null';
    }
    if (value === undefined) {
        return 'null';
    }
    if (typeof value === 'boolean') {
        return value.toString();
    }
    if (typeof value === 'number') {
        return value.toString();
    }
    if (typeof value === 'string') {
        return JSON.stringify(value);
    }
    if (Array.isArray(value)) {
        return JSON.stringify(value, null, 2);
    }
    if (typeof value === 'object') {
        return JSON.stringify(value, null, 2);
    }
    return JSON.stringify(value);
}
