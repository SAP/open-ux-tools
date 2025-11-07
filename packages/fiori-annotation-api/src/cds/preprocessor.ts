import type { Element } from '@sap-ux/odata-annotation-core-types';
import { createAttributeNode, createElementNode, Edm, TARGET_TYPE } from '@sap-ux/odata-annotation-core-types';
import { printKey, type Target } from '@sap-ux/cds-odata-annotation-converter';

import type { AnnotationGroup, AnnotationGroupItems, Record as RecordNode } from '@sap-ux/cds-annotation-parser';
import {
    ANNOTATION_GROUP_ITEMS_TYPE,
    ANNOTATION_GROUP_TYPE,
    ANNOTATION_TYPE,
    COLLECTION_TYPE,
    RECORD_PROPERTY_TYPE,
    RECORD_TYPE
} from '@sap-ux/cds-annotation-parser';

import type { JsonPointer } from '../types';
import {
    DELETE_TARGET_CHANGE_TYPE,
    DELETE_ANNOTATION_CHANGE_TYPE,
    DELETE_EMBEDDED_ANNOTATION_CHANGE_TYPE,
    DELETE_RECORD_PROPERTY_CHANGE_TYPE,
    INSERT_ANNOTATION_CHANGE_TYPE,
    INSERT_EMBEDDED_ANNOTATION_CHANGE_TYPE,
    INSERT_RECORD_PROPERTY_CHANGE_TYPE,
    SET_FLAGS_CHANGE_TYPE,
    UPDATE_PRIMITIVE_VALUE_CHANGE_TYPE,
    createConvertToCompoundAnnotationChange,
    createDeleteTargetChange,
    createDeleteAnnotationChange,
    createDeleteEmbeddedChange,
    createDeleteRecordChange,
    createDeleteRecordPropertyChange,
    createReplaceNodeChange,
    createDeleteAnnotationGroupChange,
    DELETE_ANNOTATION_GROUP_CHANGE_TYPE,
    INSERT_PRIMITIVE_VALUE_TYPE,
    INSERT_RECORD_CHANGE_TYPE,
    INSERT_TARGET_CHANGE_TYPE,
    createDeleteAnnotationGroupItemsChange,
    DELETE_ANNOTATION_GROUP_ITEMS_CHANGE_TYPE,
    MOVE_COLLECTION_VALUE_CHANGE_TYPE,
    DELETE_RECORD_CHANGE_TYPE
} from './change';
import type {
    Deletes,
    CDSDocumentChange,
    InsertRecord,
    InsertEmbeddedAnnotation,
    InsertAnnotation,
    MoveCollectionValue,
    DeleteRecord
} from './change';
import { getChildCount, type AstNode, type CDSDocument } from './document';
import { getAstNodesFromPointer } from './pointer';
import type { CompilerToken } from './cds-compiler-tokens';
import { findLastTokenBeforePosition } from './cds-compiler-tokens';
import { getElementAttribute } from '@sap-ux/odata-annotation-core';

/**
 *
 */
class ChangePreprocessor {
    private commands: Map<number, ChangeCommand> = new Map();

    /**
     *
     * @param document - CDS document object.
     * @param input - CDS document changes.
     * @param tokens - All tokens in the document.
     */
    constructor(
        private readonly document: CDSDocument,
        private readonly input: CDSDocumentChange[],
        private readonly tokens: CompilerToken[]
    ) {}

    /**
     * Optimizes changes to remove duplicates and conflicting changes.
     *
     * @returns Optimized CDS document changes.
     */
    run(): CDSDocumentChange[] {
        this.normalizeInsertIndex();
        this.removeDuplicates();
        this.combineInsertsWithDeletions();
        this.expandToCompoundAnnotations();
        this.mergeDeletes();

        const result: CDSDocumentChange[] = [];

        for (let index = 0; index < this.input.length; index++) {
            const change = this.input[index];
            const command = this.commands.get(index);
            if (command?.type === 'drop') {
                continue;
            } else if (command?.type === 'replace') {
                result.push(...command.changes);
            } else if (command === undefined || command?.type === 'pick') {
                result.push(change);
            }
        }

        this.adjustMoveIndices(result); // for this to correctly work we need the final delete changes with adjusted pointers
        return result;
    }

    /**
     * Makes sure that inserts in an empty container have the same insert positions.
     */

    private normalizeInsertIndex(): void {
        for (let i = 0; i < this.input.length; i++) {
            const change = this.input[i];
            const [parent] = getAstNodesFromPointer(this.document, change.pointer).reverse();
            if (
                !parent ||
                (parent.type !== COLLECTION_TYPE &&
                    parent.type !== RECORD_TYPE &&
                    parent.type !== ANNOTATION_GROUP_ITEMS_TYPE &&
                    parent.type !== TARGET_TYPE)
            ) {
                continue;
            }
            if (
                getChildCount(parent) > 0 ||
                ![
                    INSERT_RECORD_CHANGE_TYPE,
                    INSERT_ANNOTATION_CHANGE_TYPE,
                    INSERT_EMBEDDED_ANNOTATION_CHANGE_TYPE,
                    INSERT_RECORD_PROPERTY_CHANGE_TYPE,
                    INSERT_PRIMITIVE_VALUE_TYPE,
                    INSERT_TARGET_CHANGE_TYPE
                ].includes(change.type)
            ) {
                continue;
            }
            const newChange = structuredClone(change) as InsertRecord;
            newChange.index = 0;
            this.commands.set(i, {
                type: 'replace',
                changes: [newChange]
            });
        }
    }

    private removeDuplicates(): void {
        for (let index = this.input.length - 1; index >= 0; index--) {
            const currentChange = this.input[index];
            if (
                !currentChange.type.startsWith('delete') &&
                !currentChange.type.startsWith('replace') &&
                currentChange.type !== UPDATE_PRIMITIVE_VALUE_CHANGE_TYPE &&
                currentChange.type !== SET_FLAGS_CHANGE_TYPE
            ) {
                continue;
            }
            for (let j = 0; j < index; j++) {
                const otherChange = this.input[j];
                const isOtherChangeDestructive =
                    otherChange.type.startsWith('delete') || otherChange.type.startsWith('replace');
                if (
                    index !== j &&
                    ((currentChange.type === otherChange.type && currentChange.pointer === otherChange.pointer) ||
                        // if parent element is modified, child can't be modified => drop child changes
                        (isOtherChangeDestructive && isChildOf(otherChange.pointer, currentChange.pointer)))
                ) {
                    this.commands.set(j, {
                        type: 'drop'
                    });
                } else if (
                    index !== j &&
                    isOtherChangeDestructive &&
                    // child property change is after parent property deletion => drop child change
                    isChildOf(currentChange.pointer, otherChange.pointer)
                ) {
                    this.commands.set(index, {
                        type: 'drop'
                    });
                }
            }
        }
    }

    /**
     *
     * @param deletionMap
     * @param insertionMap
     * @param index
     */
    private processChangesInputEntry(
        deletionMap: Record<string, DeletionIndex[]>,
        insertionMap: Record<string, boolean>,
        index: number
    ): void {
        const command = this.commands.get(index);
        if (command?.type === 'drop') {
            // if the change is already dropped it is not relevant for further processing
            return;
        }
        const change = this.input[index];
        if (change.type === DELETE_TARGET_CHANGE_TYPE) {
            const deletionsInParent = (deletionMap[change.pointer] ??= []);
            deletionsInParent.push({
                change,
                index
            });
        }
        if (
            change.type === DELETE_ANNOTATION_CHANGE_TYPE ||
            change.type === DELETE_ANNOTATION_GROUP_CHANGE_TYPE ||
            change.type === DELETE_EMBEDDED_ANNOTATION_CHANGE_TYPE ||
            change.type === DELETE_RECORD_PROPERTY_CHANGE_TYPE
        ) {
            const parentPointer = change.pointer.split('/').slice(0, -2).join('/');
            const realPointer = parentPointer === '' ? change.pointer : parentPointer;
            const deletionsInParent = (deletionMap[realPointer] ??= []);
            deletionsInParent.push({
                change,
                index
            });
        }
        if (change.type === DELETE_ANNOTATION_GROUP_ITEMS_CHANGE_TYPE) {
            const parentPointer = change.pointer.split('/').slice(0, -1).join('/');
            const deletionsInParent = (deletionMap[parentPointer] ??= []);
            deletionsInParent.push({
                change,
                index
            });
        }
        if (
            change.type === INSERT_RECORD_PROPERTY_CHANGE_TYPE ||
            change.type === INSERT_EMBEDDED_ANNOTATION_CHANGE_TYPE ||
            change.type === INSERT_ANNOTATION_CHANGE_TYPE
        ) {
            insertionMap[change.pointer] = true;
        }
    }

    private mergeDeletes(): void {
        const deletionMap: Record<string, DeletionIndex[]> = {};
        const insertionMap: Record<string, boolean> = {};
        // optimize deletion changes
        for (let index = 0; index < this.input.length; index++) {
            this.processChangesInputEntry(deletionMap, insertionMap, index);
        }
        this.processDeletionMap(deletionMap, insertionMap);
    }

    /**
     *
     * @param deletionMap
     * @param insertionMap
     */
    private processDeletionMap(
        deletionMap: Record<string, DeletionIndex[]>,
        insertionMap: Record<string, boolean>
    ): void {
        while (Object.keys(deletionMap).length > 0) {
            // picking longest pointer ensures that the deletion changes are bubbling up
            const parentPointer = Object.keys(deletionMap).reduce(
                (longest, pointer) => (longest.split('/').length < pointer.split('/').length ? pointer : longest),
                '/'
            );
            const [parent, grandParent, greatGrandParent] = getAstNodesFromPointer(
                this.document,
                parentPointer
            ).reverse();
            if (parent?.type === RECORD_TYPE) {
                this.processRecordDeletion(
                    parent,
                    grandParent,
                    greatGrandParent,
                    parentPointer,
                    deletionMap,
                    insertionMap
                );
            } else if (parent?.type === TARGET_TYPE) {
                this.processTargetDeletion(parent, parentPointer, deletionMap, insertionMap);
            } else if (parent?.type === ANNOTATION_GROUP_TYPE && grandParent?.type === TARGET_TYPE) {
                this.processAnnotationGroupDeletion(parent, grandParent, parentPointer, deletionMap, insertionMap);
            } else if (
                parent?.type === ANNOTATION_GROUP_ITEMS_TYPE &&
                grandParent.type === ANNOTATION_GROUP_TYPE &&
                greatGrandParent?.type === TARGET_TYPE
            ) {
                this.processAnnotationGroupItemsDeletion(parent, grandParent, parentPointer, deletionMap, insertionMap);
            }

            delete deletionMap[parentPointer];
        }
    }

    /**
     *
     * @param parent
     * @param grandParent
     * @param greatGrandParent
     * @param parentPointer
     * @param deletionMap
     * @param insertionMap
     */
    private processRecordDeletion(
        parent: RecordNode,
        grandParent: AstNode | undefined,
        greatGrandParent: AstNode | undefined,
        parentPointer: string,
        deletionMap: Record<string, DeletionIndex[]>,
        insertionMap: Record<string, boolean>
    ): void {
        const childPointers = new Set([
            ...parent.properties.map((_, i) => `${parentPointer}/properties/${i}`),
            ...(parent.annotations ?? []).map((_, i) => `${parentPointer}/annotations/${i}`)
        ]);
        for (const indexedValue of deletionMap[parentPointer]) {
            childPointers.delete(indexedValue.change.pointer);
        }
        if (childPointers.size === 0 && !insertionMap[parentPointer]) {
            this.bubbleUpDeleteChange(deletionMap, grandParent, greatGrandParent, parentPointer);
        }
    }

    /**
     *
     * @param parent
     * @param parentPointer
     * @param deletionMap
     * @param insertionMap
     */
    private processTargetDeletion(
        parent: Target,
        parentPointer: string,
        deletionMap: Record<string, DeletionIndex[]>,
        insertionMap: Record<string, boolean>
    ): void {
        const childPointers = new Set([...parent.assignments.map((_, i) => `${parentPointer}/assignments/${i}`)]);
        for (const indexedValue of deletionMap[parentPointer]) {
            childPointers.delete(indexedValue.change.pointer);
        }
        if (childPointers.size === 0 && !insertionMap[parentPointer]) {
            this.bubbleUpDeleteChange(deletionMap, parent, undefined, parentPointer);
        }
    }

    /**
     *
     * @param parent
     * @param grandParent
     * @param parentPointer
     * @param deletionMap
     * @param insertionMap
     */
    private processAnnotationGroupDeletion(
        parent: AnnotationGroup,
        grandParent: Target,
        parentPointer: string,
        deletionMap: Record<string, DeletionIndex[]>,
        insertionMap: Record<string, boolean>
    ): void {
        if (!insertionMap[parentPointer]) {
            // most probably this if-check is redundant but is left just for safety reasons
            this.bubbleUpDeleteChange(deletionMap, parent, grandParent, parentPointer);
        }
    }

    /**
     *
     * @param parent
     * @param grandParent
     * @param parentPointer
     * @param deletionMap
     * @param insertionMap
     */
    private processAnnotationGroupItemsDeletion(
        parent: AnnotationGroupItems,
        grandParent: AnnotationGroup,
        parentPointer: string,
        deletionMap: Record<string, DeletionIndex[]>,
        insertionMap: Record<string, boolean>
    ): void {
        const childPointers = new Set([...parent.items.map((_, i) => `${parentPointer}/items/${i}`)]);
        for (const indexedValue of deletionMap[parentPointer]) {
            childPointers.delete(indexedValue.change.pointer);
        }

        if (
            childPointers.size === 0 &&
            !insertionMap[parentPointer] &&
            !insertionMap[parentPointer.split('/').slice(0, -1).join('/')]
        ) {
            this.bubbleUpDeleteChange(deletionMap, parent, grandParent, parentPointer);
        }
    }

    /**
     *
     * @param deletionMap
     * @param grandParent
     * @param greatGrandParent
     * @param parentPointer
     */
    private bubbleUpDeleteChange(
        deletionMap: Record<string, DeletionIndex[]>,
        grandParent: AstNode | undefined,
        greatGrandParent: AstNode | undefined,
        parentPointer: string
    ): void {
        // no more children => delete record
        // propagate change of the parent up (if required)
        // only skip for collection entries

        const lastChange = this.dropMergedDeletionChanges(deletionMap[parentPointer]);
        if (lastChange === -1 || !grandParent) {
            return;
        }
        const nextParentPointer = this.getBubbleUpParentPointer(grandParent, greatGrandParent, parentPointer);
        const newChange = this.getMergedChange(grandParent, parentPointer, greatGrandParent);
        if (!newChange) {
            return;
        }
        if (nextParentPointer) {
            const deletionsInParent = (deletionMap[nextParentPointer] ??= []);
            deletionsInParent.push({
                change: newChange,
                index: lastChange
            });
        }
        this.commands.set(lastChange, {
            type: 'replace',
            changes: [newChange]
        });
    }

    /**
     *
     * @param grandParent
     * @param greatGrandParent
     * @param parentPointer
     */
    private getBubbleUpParentPointer(
        grandParent: AstNode | undefined,
        greatGrandParent: AstNode | undefined,
        parentPointer: string
    ): string | undefined {
        if (greatGrandParent?.type === RECORD_TYPE) {
            return parentPointer.split('/').slice(0, -3).join('/');
        } else if (greatGrandParent?.type === ANNOTATION_GROUP_ITEMS_TYPE) {
            return parentPointer.split('/').slice(0, -3).join('/');
        } else if (
            grandParent?.type === ANNOTATION_GROUP_ITEMS_TYPE &&
            greatGrandParent?.type === ANNOTATION_GROUP_TYPE
        ) {
            return parentPointer.split('/').slice(0, -1).join('/');
        } else if (greatGrandParent?.type === TARGET_TYPE) {
            if (grandParent?.type === ANNOTATION_GROUP_TYPE) {
                return parentPointer.split('/').slice(0, -2).join('/');
            } else {
                return parentPointer.split('/').slice(0, -3).join('/');
            }
        }
        return undefined;
    }

    /**
     *
     * @param grandParent
     * @param parentPointer
     * @param greatGrandParent
     */
    private getMergedChange(
        grandParent: AstNode,
        parentPointer: string,
        greatGrandParent: AstNode | undefined
    ): Deletes | undefined {
        const grandParentPointer = parentPointer.split('/').slice(0, -1).join('/');
        if (grandParent.type === ANNOTATION_TYPE) {
            if (greatGrandParent?.type === TARGET_TYPE || greatGrandParent?.type === ANNOTATION_GROUP_ITEMS_TYPE) {
                return createDeleteAnnotationChange(grandParentPointer);
            } else {
                return createDeleteEmbeddedChange(grandParentPointer);
            }
        } else if (grandParent.type === RECORD_PROPERTY_TYPE) {
            return createDeleteRecordPropertyChange(grandParentPointer);
        } else if (grandParent.type === COLLECTION_TYPE) {
            return createDeleteRecordChange(parentPointer);
        } else if (grandParent.type === TARGET_TYPE) {
            return createDeleteTargetChange(parentPointer);
        } else if (grandParent.type === ANNOTATION_GROUP_TYPE) {
            return createDeleteAnnotationGroupChange(parentPointer);
        } else if (grandParent.type === ANNOTATION_GROUP_ITEMS_TYPE) {
            return createDeleteAnnotationGroupItemsChange(grandParentPointer);
        }
        return undefined;
    }

    /**
     * Avoid conflicting insert and deletion changes for the same position.
     */
    private combineInsertsWithDeletions(): void {
        // Inserts are usually merged together, so we need to replace the last insert of the batch for the same index
        for (let i = 0; i < this.input.length; i++) {
            const change = this.input[i];
            const [parent, grandParent] = getAstNodesFromPointer(this.document, change.pointer).reverse();
            if (
                change.type === INSERT_ANNOTATION_CHANGE_TYPE &&
                (parent?.type === TARGET_TYPE || parent?.type === ANNOTATION_GROUP_ITEMS_TYPE)
            ) {
                const pointerFragments = [change.pointer];
                if (parent.type === ANNOTATION_GROUP_ITEMS_TYPE) {
                    const index = change.index ?? parent.items.length - 1;
                    pointerFragments.push(index.toString());
                } else {
                    const index = change.index ?? parent.assignments.length - 1;
                    pointerFragments.push('assignments');
                    pointerFragments.push(index.toString());
                }
                const pointer = pointerFragments.join('/');
                // merge inserts and deletions
                const deletionChangeIndex = this.input.findIndex(
                    (c) => c.pointer === pointer && c.type === DELETE_ANNOTATION_CHANGE_TYPE
                );
                const command = this.commands.get(deletionChangeIndex);
                if (command?.type === 'drop') {
                    continue;
                }
                if (deletionChangeIndex !== -1) {
                    this.createReplaceCommand(pointer, change, deletionChangeIndex, i);
                }
            } else if (
                change.type === INSERT_EMBEDDED_ANNOTATION_CHANGE_TYPE &&
                (grandParent?.type === TARGET_TYPE || grandParent?.type === ANNOTATION_GROUP_ITEMS_TYPE)
            ) {
                // currently this is not supported for longer deeper structures
                // e.g multiple levels of annotations on an annotation with a primitive value
                const index =
                    change.index ??
                    (grandParent.type === ANNOTATION_GROUP_ITEMS_TYPE
                        ? grandParent.items.length - 1
                        : grandParent.assignments.length - 1);

                const pointer = `${change.pointer.split('/').slice(0, -1).join('/')}/${index}`;
                const deletionChangeIndex = this.input.findIndex(
                    (c) => c.pointer === pointer && c.type === DELETE_ANNOTATION_CHANGE_TYPE
                );
                const command = this.commands.get(deletionChangeIndex);
                if (command?.type === 'drop') {
                    continue;
                }
                if (deletionChangeIndex !== -1) {
                    this.flattenAnnotationTerm(change, parent);
                    this.createReplaceCommand(pointer, change, deletionChangeIndex, i);
                }
            }
        }
    }

    /**
     *
     * @param pointer
     * @param change
     * @param deletionChangeIndex
     * @param changeIndex
     */
    private createReplaceCommand(
        pointer: string,
        change: InsertEmbeddedAnnotation | InsertAnnotation,
        deletionChangeIndex: number,
        changeIndex: number
    ): void {
        this.commands.set(changeIndex, {
            type: 'replace',
            changes: [createReplaceNodeChange(pointer, change.element)]
        });
        this.commands.set(deletionChangeIndex, {
            type: 'drop'
        });
    }

    /**
     *
     * @param change
     * @param parent
     */
    private flattenAnnotationTerm(change: InsertEmbeddedAnnotation, parent: AstNode): void {
        const element = createReferenceElement(parent);
        const last = structuredClone(change.element);
        delete last.attributes[Edm.Qualifier];
        const context = [last];
        if (element) {
            context.unshift(element);
            const term = getElementAttribute(change.element, Edm.Term);
            if (term) {
                term.value = printKey(context);
            }
        }
    }

    private expandToCompoundAnnotations(): void {
        // Inserts are usually merged together, so we need to replace the last insert of the batch for the same index
        const handledAssignments = new Set<string>();
        // we need to start from the end because the conversion change should come after last insert
        for (let i = this.input.length - 1; i >= 0; i--) {
            const change = this.input[i];
            const path = getAstNodesFromPointer(this.document, change.pointer);
            const [parent, grandParent] = path.toReversed();
            let pointer = change.pointer;
            let target = parent;
            if (
                change.type === INSERT_EMBEDDED_ANNOTATION_CHANGE_TYPE &&
                parent.type === ANNOTATION_TYPE &&
                grandParent.type === TARGET_TYPE &&
                path.length === 2
            ) {
                // annotations on top level annotations will be appended to the current assignment
                // update pointer to target
                target = grandParent;
                pointer = change.pointer.split('/').slice(0, -2).join('/');
            } else if (change.type !== INSERT_ANNOTATION_CHANGE_TYPE || target?.type !== TARGET_TYPE) {
                continue;
            }
            const command = this.commands.get(i);
            if (command && command.type !== 'pick') {
                // if the change is replaced or dropped we shouldn't do anything
                continue;
            }
            if (!handledAssignments.has(pointer)) {
                handledAssignments.add(pointer);

                // make sure that the assignment isn't already a compound assignment
                const startPosition =
                    target.assignments[target.assignments.length - 1]?.range?.start ?? target.range?.start;
                if (!startPosition) {
                    continue;
                }
                const startToken = findLastTokenBeforePosition(/^@/i, this.tokens, startPosition);
                if (!startToken) {
                    continue;
                }
                const nextToken = this.tokens[startToken.tokenIndex + 1];
                if (!nextToken || nextToken.text === '(') {
                    continue;
                }
                const deletion = this.input.find(
                    (c) =>
                        (c.type.startsWith('delete') || c.type.startsWith('replace')) && c.pointer.startsWith(pointer)
                );
                this.commands.set(i, {
                    type: 'replace',
                    changes: [change, createConvertToCompoundAnnotationChange(pointer, deletion === undefined)]
                });
            }
        }
    }

    /**
     *
     * @param index
     */
    private dropMergedDeletionChanges(index: DeletionIndex[]): number {
        let lastChange = -1;
        for (const indexedValue of index) {
            if (indexedValue.index > lastChange) {
                lastChange = indexedValue.index;
            }
            this.commands.set(indexedValue.index, { type: 'drop' });
        }
        return lastChange;
    }

    /**
     *
     * @param changes
     */
    private adjustMoveIndices(changes: CDSDocumentChange[]): void {
        // there is a non standard case where an item is moved to position that is after deleted item
        // it interferes with deletion logic and would be more difficult to handle it during text edit generation
        // the expected text is the same as if we would insert before the deleted item, so we adjust the move index here
        const moves: MoveCollectionValue[] = [];
        const deletes: DeleteRecord[] = [];
        for (const change of changes) {
            if (change.type === MOVE_COLLECTION_VALUE_CHANGE_TYPE) {
                moves.push(change);
            } else if (change.type === DELETE_RECORD_CHANGE_TYPE) {
                deletes.push(change);
            }
        }
        if (moves.length === 0 || deletes.length === 0) {
            return;
        }
        for (const move of moves) {
            if (move.index === undefined) {
                // it will be inserted at the start, not relevant case
                continue;
            }
            const pointer = `${move.pointer}/items/${move.index - 1}`;
            const match = deletes.find((change) => change.pointer === pointer);
            if (match) {
                move.index--;
            }
        }
    }
}

/**
 * Takes the change as is
 */
interface PickChangeCommand {
    type: 'pick';
}
/**
 * Ignores the change
 */
interface DropChangeCommand {
    type: 'drop';
}

/**
 * Replaces the change with a different change
 */
interface ReplaceChangeCommand {
    type: 'replace';
    changes: CDSDocumentChange[];
}

type ChangeCommand = PickChangeCommand | DropChangeCommand | ReplaceChangeCommand;

interface DeletionIndex {
    change: Deletes;
    index: number;
}

/**
 * Checks if pointer of first element is a child of the second one.
 *
 * @param child - Pointer to the child.
 * @param parent - Pointer to the parent.
 * @returns True if first pointer is a child of the second pointer.
 */
function isChildOf(child: JsonPointer, parent: JsonPointer): boolean {
    const childSegments = child.split('/');
    const parentSegments = parent.split('/');
    if (childSegments.length < parentSegments.length) {
        return false;
    }
    for (let index = 0; index < parentSegments.length; index++) {
        const parentSegment = parentSegments[index];
        const childSegment = childSegments[index];
        if (childSegment !== parentSegment) {
            return false;
        }
    }
    return true;
}

/**
 * Prepares changes so that they can be processed sequentially without interfering with each other.
 * This includes removing duplicates, merging deletions etc.
 *
 * @param document - CDS document.
 * @param changes - CDS document changes.
 * @param tokens - All tokens in the document.
 * @returns Optimized CDS document changes.
 */
export function preprocessChanges(
    document: CDSDocument,
    changes: CDSDocumentChange[],
    tokens: CompilerToken[]
): CDSDocumentChange[] {
    //
    const preprocessor = new ChangePreprocessor(document, changes, tokens);
    return preprocessor.run();
}

/**
 * Creates a reference element used for building flattened annotation keys.
 *
 * @param astNode - AST node to be converted to a reference element.
 * @returns Reference element.
 */
export function createReferenceElement(astNode?: AstNode): Element | undefined {
    if (astNode?.type === ANNOTATION_TYPE) {
        const element = createElementNode({
            name: Edm.Annotation,
            attributes: {
                [Edm.Term]: createAttributeNode(Edm.Term, astNode.term.value)
            }
        });
        if (astNode.qualifier) {
            element.attributes[Edm.Qualifier] = createAttributeNode(Edm.Qualifier, astNode.qualifier.value);
        }
        return element;
    } else if (astNode?.type === RECORD_PROPERTY_TYPE) {
        const element = createElementNode({
            name: Edm.PropertyValue,
            attributes: {
                [Edm.Property]: createAttributeNode(Edm.Property, astNode.name.value)
            }
        });
        return element;
    }
    return undefined;
}
