import { TARGET_TYPE } from '@sap-ux/odata-annotation-core-types';
import type { Target } from '@sap-ux/cds-odata-annotation-converter';

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
    type InsertRecord
} from './change';
import type { Deletes, CDSDocumentChange } from './change';
import { getChildCount, type AstNode, type CDSDocument } from './document';
import { getAstNodesFromPointer } from './pointer';

/**
 *
 */
class ChangePreprocessor {
    private commands: Map<number, ChangeCommand> = new Map();

    /**
     *
     * @param document - CDS document object.
     * @param input - CDS document changes.
     */
    constructor(private document: CDSDocument, private input: CDSDocumentChange[]) {}

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
        return result;
    }

    /**
     * Makes sure that inserts in an empty container have the same insert positions.
     */

    private normalizeInsertIndex() {
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

    private removeDuplicates() {
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

    private processChangesInputEntry(
        deletionMap: Record<string, DeletionIndex[]>,
        insertionMap: Record<string, boolean>,
        index: number
    ) {
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

    private mergeDeletes() {
        const deletionMap: Record<string, DeletionIndex[]> = {};
        const insertionMap: Record<string, boolean> = {};
        // optimize deletion changes
        for (let index = 0; index < this.input.length; index++) {
            this.processChangesInputEntry(deletionMap, insertionMap, index);
        }
        this.processDeletionMap(deletionMap, insertionMap);
    }

    private processDeletionMap(deletionMap: Record<string, DeletionIndex[]>, insertionMap: Record<string, boolean>) {
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

    private processRecordDeletion(
        parent: RecordNode,
        grandParent: AstNode | undefined,
        greatGrandParent: AstNode | undefined,
        parentPointer: string,
        deletionMap: Record<string, DeletionIndex[]>,
        insertionMap: Record<string, boolean>
    ) {
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

    private processTargetDeletion(
        parent: Target,
        parentPointer: string,
        deletionMap: Record<string, DeletionIndex[]>,
        insertionMap: Record<string, boolean>
    ) {
        const childPointers = new Set([...parent.assignments.map((_, i) => `${parentPointer}/assignments/${i}`)]);
        for (const indexedValue of deletionMap[parentPointer]) {
            childPointers.delete(indexedValue.change.pointer);
        }
        if (childPointers.size === 0 && !insertionMap[parentPointer]) {
            this.bubbleUpDeleteChange(deletionMap, parent, undefined, parentPointer);
        }
    }

    private processAnnotationGroupDeletion(
        parent: AnnotationGroup,
        grandParent: Target,
        parentPointer: string,
        deletionMap: Record<string, DeletionIndex[]>,
        insertionMap: Record<string, boolean>
    ) {
        if (!insertionMap[parentPointer]) {
            // most probably this if-check is redundant but is left just for safety reasons
            this.bubbleUpDeleteChange(deletionMap, parent, grandParent, parentPointer);
        }
    }

    private processAnnotationGroupItemsDeletion(
        parent: AnnotationGroupItems,
        grandParent: AnnotationGroup,
        parentPointer: string,
        deletionMap: Record<string, DeletionIndex[]>,
        insertionMap: Record<string, boolean>
    ) {
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

    private bubbleUpDeleteChange(
        deletionMap: Record<string, DeletionIndex[]>,
        grandParent: AstNode | undefined,
        greatGrandParent: AstNode | undefined,
        parentPointer: string
    ) {
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
            const [parent] = getAstNodesFromPointer(this.document, change.pointer).reverse();
            if (change.type !== INSERT_ANNOTATION_CHANGE_TYPE || parent?.type !== TARGET_TYPE) {
                continue;
            }
            // merge inserts and deletions
            const index = change.index ?? parent.assignments.length - 1;
            const pointer = `${change.pointer}/assignments/${index}`;
            const deletionChangeIndex = this.input.findIndex(
                (c) => c.pointer === pointer && c.type === DELETE_ANNOTATION_CHANGE_TYPE
            );
            const command = this.commands.get(deletionChangeIndex);
            if (command?.type === 'drop') {
                continue;
            }
            if (deletionChangeIndex !== -1) {
                this.commands.set(i, {
                    type: 'replace',
                    changes: [createReplaceNodeChange(pointer, change.element)]
                });
                this.commands.set(deletionChangeIndex, {
                    type: 'drop'
                });
            }
        }
    }

    private expandToCompoundAnnotations() {
        // Inserts are usually merged together, so we need to replace the last insert of the batch for the same index
        const handledAssignments = new Set<string>();
        // we need to start from the end because the conversion change should come after last insert
        for (let i = this.input.length - 1; i >= 0; i--) {
            const change = this.input[i];
            const [parent] = getAstNodesFromPointer(this.document, change.pointer).reverse();
            if (change.type !== INSERT_ANNOTATION_CHANGE_TYPE || parent?.type !== TARGET_TYPE) {
                continue;
            }
            const command = this.commands.get(i);
            if (command && command.type !== 'pick') {
                // if the change is replaced or dropped we shouldn't do anything
                continue;
            }
            if (!handledAssignments.has(change.pointer)) {
                handledAssignments.add(change.pointer);
                const deletion = this.input.find(
                    (c) =>
                        (c.type.startsWith('delete') || c.type.startsWith('replace')) &&
                        c.pointer.startsWith(change.pointer)
                );
                this.commands.set(i, {
                    type: 'replace',
                    changes: [change, createConvertToCompoundAnnotationChange(change.pointer, deletion === undefined)]
                });
            }
        }
    }

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
 * @returns Optimized CDS document changes.
 */
export function preprocessChanges(document: CDSDocument, changes: CDSDocumentChange[]): CDSDocumentChange[] {
    //
    const preprocessor = new ChangePreprocessor(document, changes);
    return preprocessor.run();
}
