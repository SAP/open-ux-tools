import type { JSONRuleContext } from './rule-factory';
import type { AnyNode, MemberNode, ObjectNode } from '@humanwhocodes/momoa';
import type { DeepestExistingPathResult } from '../utils/helpers';
import type { RuleTextEdit, RuleTextEditor } from '@eslint/core';

/**
 * Represents a JSON value that can be set in the manifest.
 */
type JsonValue = string | number | boolean | null | Record<string, unknown> | unknown[];

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
    value?: JsonValue;

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
        } else if (value === undefined) {
            fixOperation = 'delete';
        } else {
            fixOperation = 'update';
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
function handleUpdate(fixer: RuleTextEditor, node: MemberNode, value: JsonValue | undefined): RuleTextEdit | undefined {
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
    value: JsonValue | undefined
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

    const parentObject = findParentObject(context.sourceCode.ast.body, node);
    const parentMembers = parentObject?.members ?? [];
    const nodeIndex = findNodeIndex(parentMembers, startOffset, endOffset);
    const isLastProperty = nodeIndex !== -1 && nodeIndex === parentMembers.length - 1;

    const lineStartOffset = findLineStart(sourceCode, startOffset);

    if (isLastProperty && nodeIndex > 0) {
        return handleLastPropertyDelete(fixer, sourceCode, parentMembers, nodeIndex, endOffset, lineStartOffset);
    }

    const deleteEndOffset = findDeleteEndOffset(sourceCode, endOffset, true);
    return fixer.removeRange([lineStartOffset, deleteEndOffset]);
}

/**
 * Finds the index of a node in the parent members array.
 *
 * @param parentMembers - Array of member nodes
 * @param startOffset - Start offset of the node
 * @param endOffset - End offset of the node
 * @returns Index of the node or -1 if not found
 */
function findNodeIndex(parentMembers: MemberNode[], startOffset: number, endOffset: number): number {
    return parentMembers.findIndex(
        (member: MemberNode) =>
            member.name.loc.start.offset === startOffset && member.value.loc.end.offset === endOffset
    );
}

/**
 * Finds the start of the line (including leading whitespace).
 *
 * @param sourceCode - The source code text
 * @param startOffset - The starting offset
 * @returns The offset at the start of the line
 */
function findLineStart(sourceCode: string, startOffset: number): number {
    let lineStartOffset = startOffset;
    while (lineStartOffset > 0 && sourceCode[lineStartOffset - 1] !== '\n') {
        lineStartOffset--;
    }
    return lineStartOffset;
}

/**
 * Finds the end offset for deletion, optionally including trailing comma.
 *
 * @param sourceCode - The source code text
 * @param endOffset - The current end offset
 * @param includeComma - Whether to include a trailing comma
 * @returns The end offset for deletion
 */
function findDeleteEndOffset(sourceCode: string, endOffset: number, includeComma: boolean): number {
    let deleteEndOffset = endOffset;
    let commaFound = false;
    for (let i = endOffset; i < sourceCode.length; i++) {
        const char = sourceCode[i];
        if (char === '\n') {
            deleteEndOffset = i + 1;
            break;
        } else if (char === ',') {
            deleteEndOffset = i + 1;
            if (includeComma) {
                commaFound = true;
                // Continue to find the newline after the comma
            } else {
                // Don't include comma, stop before it
                deleteEndOffset = i;
                break;
            }
        } else if (/\s/.test(char)) {
            deleteEndOffset = i + 1;
            if (commaFound && !includeComma) {
                // Already found comma and don't want to include it, stop
                break;
            }
        } else {
            // Hit a non-whitespace, non-comma character
            break;
        }
    }
    return deleteEndOffset;
}

/**
 * Finds the comma offset after a node's value.
 *
 * @param sourceCode - The source code text
 * @param previousValueEnd - End offset of the previous value
 * @param startOffset - Start offset to search up to
 * @returns The comma offset or -1 if not found
 */
function findCommaOffset(sourceCode: string, previousValueEnd: number, startOffset: number): number {
    for (let i = previousValueEnd; i < startOffset; i++) {
        if (sourceCode[i] === ',') {
            return i;
        }
    }
    return -1;
}

/**
 * Handles deletion of the last property in an object.
 *
 * @param fixer - The ESLint fixer object
 * @param sourceCode - The source code text
 * @param parentMembers - Array of parent members
 * @param nodeIndex - Index of the node being deleted
 * @param endOffset - End offset of the node
 * @param lineStartOffset - Start of the line offset
 * @returns Fixer result or undefined
 */
function handleLastPropertyDelete(
    fixer: RuleTextEditor,
    sourceCode: string,
    parentMembers: MemberNode[],
    nodeIndex: number,
    endOffset: number,
    lineStartOffset: number
): RuleTextEdit[] | RuleTextEdit | undefined {
    const previousNode = parentMembers[nodeIndex - 1];
    const previousValueEnd = previousNode.value.loc.end.offset;
    const commaOffset = findCommaOffset(sourceCode, previousValueEnd, lineStartOffset);
    const deleteEndOffset = findDeleteEndOffset(sourceCode, endOffset, false);

    if (commaOffset !== -1) {
        return [
            fixer.removeRange([commaOffset, commaOffset + 1]),
            fixer.removeRange([lineStartOffset, deleteEndOffset])
        ];
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
function findParentObject(node: AnyNode, targetMember: MemberNode): ObjectNode | undefined {
    if (!node) {
        return undefined;
    }

    if (node.type === 'Object' && node.members) {
        return searchInObjectMembers(node, targetMember);
    }

    if (node.type === 'Array' && node.elements) {
        return searchInArrayElements(node.elements, targetMember);
    }

    return undefined;
}

/**
 * Checks if a member node matches the target member.
 *
 * @param member - The member to check
 * @param targetMember - The target member to match against
 * @returns True if the member matches the target
 */
function isMemberMatchingTarget(member: MemberNode, targetMember: MemberNode): boolean {
    return (
        member.name.loc.start.offset === targetMember.name.loc.start.offset &&
        member.value.loc.end.offset === targetMember.value.loc.end.offset
    );
}

/**
 * Searches for the parent object in object members.
 *
 * @param node - The object node to search in
 * @param targetMember - The target member to find
 * @returns The parent ObjectNode if found, undefined otherwise
 */
function searchInObjectMembers(node: ObjectNode, targetMember: MemberNode): ObjectNode | undefined {
    // Check if any direct member matches the target
    for (const member of node.members as MemberNode[]) {
        if (isMemberMatchingTarget(member, targetMember)) {
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

    return undefined;
}

/**
 * Searches for the parent object in array elements.
 *
 * @param elements - The array elements to search in
 * @param targetMember - The target member to find
 * @returns The parent ObjectNode if found, undefined otherwise
 */
function searchInArrayElements(elements: AnyNode[], targetMember: MemberNode): ObjectNode | undefined {
    for (const element of elements) {
        const found = findParentObject(element, targetMember);
        if (found) {
            return found;
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
    value: JsonValue | undefined,
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
function formatJsonValue(value: JsonValue | undefined): string {
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
