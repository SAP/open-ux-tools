import type { Element, Target as AnnotationFileTarget } from '@sap-ux/odata-annotation-core';
import type { JsonPointer } from '../types';

//#region Insert Changes
export const INSERT_TARGET_CHANGE_TYPE = 'insert-target';
export interface InsertTarget {
    type: typeof INSERT_TARGET_CHANGE_TYPE;
    /**
     * This must resolve to an element.
     */
    pointer: JsonPointer;
    target: AnnotationFileTarget;
    /**
     * Before which child element the new element should be inserted. If omitted will be added at the end.
     */
    index?: number;
}

/**
 *
 * @param pointer - Pointer to an element.
 * @param target - Internal representation of the target.
 * @param index - Before which child element the new element should be inserted. If omitted will be added at the end.
 * @returns Insert target change.
 */
export function createInsertTargetChange(
    pointer: JsonPointer,
    target: AnnotationFileTarget,
    index?: number
): InsertTarget {
    return {
        type: INSERT_TARGET_CHANGE_TYPE,
        pointer,
        target,
        index
    };
}

export type ElementInserts =
    | InsertAnnotation
    | InsertEmbeddedAnnotation
    | InsertRecord
    | InsertRecordProperty
    | InsertPrimitiveValue;
export type Inserts = ElementInserts | InsertCollection;

type InsertByType<Union, Type> = Union extends { type: Type } ? Union : never;

function insertElementChangeFactory<T extends Inserts['type']>(type: T) {
    return function (pointer: JsonPointer, element: Element, index?: number): InsertByType<ElementInserts, T> {
        return {
            type,
            pointer,
            element,
            index
        } as InsertByType<ElementInserts, T>;
    };
}

export const INSERT_RECORD_CHANGE_TYPE = 'insert-record';
export const createInsertRecordChange = insertElementChangeFactory(INSERT_RECORD_CHANGE_TYPE);
export interface InsertRecord {
    type: typeof INSERT_RECORD_CHANGE_TYPE;
    /**
     * This must resolve to value with record.
     */
    pointer: JsonPointer;
    element: Element;
    /**
     * Before which child element the new element should be inserted. If omitted will be added at the end.
     */
    index?: number;
}

export const INSERT_COLLECTION_CHANGE_TYPE = 'insert-collection';
export const createInsertCollectionChange = insertElementChangeFactory(INSERT_COLLECTION_CHANGE_TYPE);
export interface InsertCollection {
    type: typeof INSERT_COLLECTION_CHANGE_TYPE;
    /**
     * This must resolve to annotation or property.
     */
    pointer: JsonPointer;
    element: Element;
}
export const INSERT_ANNOTATION_CHANGE_TYPE = 'insert-annotation';
export const createInsertAnnotationChange = insertElementChangeFactory(INSERT_ANNOTATION_CHANGE_TYPE);
export interface InsertAnnotation {
    type: typeof INSERT_ANNOTATION_CHANGE_TYPE;
    /**
     * This must resolve target or annotation value.
     */
    pointer: JsonPointer;
    element: Element;
    /**
     * Before which child element the new element should be inserted. If omitted will be added at the end.
     */
    index?: number;
}
export const INSERT_EMBEDDED_ANNOTATION_CHANGE_TYPE = 'insert-embedded-annotation';
export const createInsertEmbeddedAnnotationChange = insertElementChangeFactory(INSERT_EMBEDDED_ANNOTATION_CHANGE_TYPE);
export interface InsertEmbeddedAnnotation {
    type: typeof INSERT_EMBEDDED_ANNOTATION_CHANGE_TYPE;
    /**
     * This must resolve to container annotation.
     */
    pointer: JsonPointer;
    element: Element;
    /**
     * Before which existing embedded annotation element the new element should be inserted. If omitted will be added at the end.
     */
    index?: number;
}
export const INSERT_RECORD_PROPERTY_CHANGE_TYPE = 'insert-record-property';
export const createInsertRecordPropertyChange = insertElementChangeFactory(INSERT_RECORD_PROPERTY_CHANGE_TYPE);
export interface InsertRecordProperty {
    type: typeof INSERT_RECORD_PROPERTY_CHANGE_TYPE;
    /**
     * This must resolve to a record.
     */
    pointer: JsonPointer;
    element: Element;
    /**
     * Before which child element the new element should be inserted. If omitted will be added at the end.
     */
    index?: number;
}

export const INSERT_PRIMITIVE_VALUE_TYPE = 'insert-primitive-value';
export const createInsertPrimitiveValueChange = insertElementChangeFactory(INSERT_PRIMITIVE_VALUE_TYPE);
export interface InsertPrimitiveValue {
    type: typeof INSERT_PRIMITIVE_VALUE_TYPE;
    /**
     * This must resolve to value with collection.
     */
    pointer: JsonPointer;
    element: Element;
    /**
     * Before which child element the new element should be inserted. If omitted will be added at the end Only applicable for collection.
     */
    index?: number;
}

export const INSERT_QUALIFIER_CHANGE_TYPE = 'insert-qualifier';
export interface InsertQualifier {
    type: typeof INSERT_QUALIFIER_CHANGE_TYPE;
    /**
     * This must resolve to an annotation.
     */
    pointer: JsonPointer;
    value: string;
}
/**
 *
 * @param pointer - Pointer to an annotation.
 * @param value - Qualifier.
 * @returns Insert qualifier change.
 */
export function createInsertQualifierChange(pointer: JsonPointer, value: string): InsertQualifier {
    return {
        type: INSERT_QUALIFIER_CHANGE_TYPE,
        pointer,
        value
    };
}

export const INSERT_REFERENCE_CHANGE_TYPE = 'insert-reference';
export interface InsertReference {
    type: typeof INSERT_REFERENCE_CHANGE_TYPE;
    /**
     * This must resolve to a value.
     */
    pointer: JsonPointer;
    references: string[];
}
/**
 *
 * @param pointer - Pointer to a document.
 * @param references - File references that needs to be added.
 * @returns Insert reference change.
 */
export function createInsertReferenceChange(pointer: JsonPointer, references: string[]): InsertReference {
    return {
        type: INSERT_REFERENCE_CHANGE_TYPE,
        pointer,
        references
    };
}

//#endregion

//#region Delete Changes
export type Deletes =
    | DeleteTarget
    | DeleteRecord
    | DeleteRecordProperty
    | DeleteAnnotationGroup
    | DeleteAnnotationGroupItems
    | DeleteAnnotation
    | DeleteEmbeddedAnnotation
    | DeletePrimitiveValue
    | DeleteQualifier;

function deleteChangeFactory<T extends Deletes['type']>(type: T) {
    return function (pointer: JsonPointer): InsertByType<Deletes, T> {
        return {
            type,
            pointer
        } as InsertByType<Deletes, T>;
    };
}

export const DELETE_TARGET_CHANGE_TYPE = 'delete-target';
export const createDeleteTargetChange = deleteChangeFactory(DELETE_TARGET_CHANGE_TYPE);
export interface DeleteTarget {
    type: typeof DELETE_TARGET_CHANGE_TYPE;
    /**
     * This must resolve to a target.
     */
    pointer: JsonPointer;
}
export const DELETE_RECORD_CHANGE_TYPE = 'delete-record';
export const createDeleteRecordChange = deleteChangeFactory(DELETE_RECORD_CHANGE_TYPE);
export interface DeleteRecord {
    type: typeof DELETE_RECORD_CHANGE_TYPE;
    /**
     * This must resolve to a record.
     */
    pointer: JsonPointer;
}

export const DELETE_RECORD_PROPERTY_CHANGE_TYPE = 'delete-record-property';
export const createDeleteRecordPropertyChange = deleteChangeFactory(DELETE_RECORD_PROPERTY_CHANGE_TYPE);
export interface DeleteRecordProperty {
    type: typeof DELETE_RECORD_PROPERTY_CHANGE_TYPE;
    /**
     * This must resolve to a record property.
     */
    pointer: JsonPointer;
}

export const DELETE_ANNOTATION_GROUP_CHANGE_TYPE = 'delete-annotation-group';
export interface DeleteAnnotationGroup {
    type: typeof DELETE_ANNOTATION_GROUP_CHANGE_TYPE;
    /**
     * This must resolve to a annotation group.
     */
    pointer: JsonPointer;
}

export const DELETE_ANNOTATION_GROUP_ITEMS_CHANGE_TYPE = 'delete-annotation-group-items';
export interface DeleteAnnotationGroupItems {
    type: typeof DELETE_ANNOTATION_GROUP_ITEMS_CHANGE_TYPE;
    /**
     * This must resolve to a annotation group items.
     */
    pointer: JsonPointer;
}

/**
 *
 * @param pointer - pointer to an annotation group
 * @returns Delete annotation group change.
 */
export function createDeleteAnnotationGroupChange(pointer: JsonPointer): DeleteAnnotationGroup {
    return {
        type: DELETE_ANNOTATION_GROUP_CHANGE_TYPE,
        pointer
    };
}

/**
 *
 * @param pointer - pointer to an annotation group
 * @returns Delete annotation group change.
 */
export function createDeleteAnnotationGroupItemsChange(pointer: JsonPointer): DeleteAnnotationGroupItems {
    return {
        type: DELETE_ANNOTATION_GROUP_ITEMS_CHANGE_TYPE,
        pointer
    };
}
export const DELETE_ANNOTATION_CHANGE_TYPE = 'delete-annotation';
export interface DeleteAnnotation {
    type: typeof DELETE_ANNOTATION_CHANGE_TYPE;
    /**
     * This must resolve to a annotation.
     */
    pointer: JsonPointer;
    target?: string; // edmx target format
}

/**
 *
 * @param pointer - Pointer to an annotation.
 * @param target - Target name.
 * @returns Delete annotation change.
 */
export function createDeleteAnnotationChange(pointer: JsonPointer, target?: string): DeleteAnnotation {
    return {
        type: DELETE_ANNOTATION_CHANGE_TYPE,
        pointer,
        target
    };
}

export const DELETE_EMBEDDED_ANNOTATION_CHANGE_TYPE = 'delete-embedded-annotation';
export const createDeleteEmbeddedChange = deleteChangeFactory(DELETE_EMBEDDED_ANNOTATION_CHANGE_TYPE);
export interface DeleteEmbeddedAnnotation {
    type: typeof DELETE_EMBEDDED_ANNOTATION_CHANGE_TYPE;
    /**
     * This must resolve to an embedded annotation.
     */
    pointer: JsonPointer;
}

export const DELETE_PRIMITIVE_VALUE_CHANGE_TYPE = 'delete-primitive-value';
export const createDeletePrimitiveValueChange = deleteChangeFactory(DELETE_PRIMITIVE_VALUE_CHANGE_TYPE);
export interface DeletePrimitiveValue {
    type: typeof DELETE_PRIMITIVE_VALUE_CHANGE_TYPE;
    /**
     * This must resolve to a value.
     */
    pointer: JsonPointer;
}

export const DELETE_QUALIFIER_CHANGE_TYPE = 'delete-qualifier';
export const createDeleteQualifierChange = deleteChangeFactory(DELETE_QUALIFIER_CHANGE_TYPE);
export interface DeleteQualifier {
    type: typeof DELETE_QUALIFIER_CHANGE_TYPE;
    /**
     * This must resolve to a qualifier.
     */
    pointer: JsonPointer;
}

//#endregion

//#region Modification Changes
export const REPLACE_NODE_CHANGE_TYPE = 'replace-node';
export interface ReplaceNode {
    type: typeof REPLACE_NODE_CHANGE_TYPE;
    pointer: JsonPointer;
    newElement: Element;
}
/**
 *
 * @param pointer - Pointer to a node.
 * @param element - Replacement node in internal representation.
 * @returns Replace node change.
 */
export function createReplaceNodeChange(pointer: JsonPointer, element: Element): ReplaceNode {
    return {
        type: REPLACE_NODE_CHANGE_TYPE,
        pointer,
        newElement: element
    };
}

export const REPLACE_RECORD_PROPERTY_CHANGE_TYPE = 'replace-record-property';
export interface ReplaceRecordProperty {
    type: typeof REPLACE_RECORD_PROPERTY_CHANGE_TYPE;
    /**
     * This must resolve to record property.
     */
    pointer: JsonPointer;
    newProperty: Element;
}

/**
 *
 * @param pointer - Pointer to a record property.
 * @param element - New Record property in internal representation.
 * @returns Replace record property change.
 */
export function createReplaceRecordPropertyChange(pointer: JsonPointer, element: Element): ReplaceRecordProperty {
    return {
        type: REPLACE_RECORD_PROPERTY_CHANGE_TYPE,
        pointer,
        newProperty: element
    };
}

export const REPLACE_TEXT_VALUE_CHANGE_TYPE = 'replace-text-value';
export interface ReplaceTextValue {
    type: typeof REPLACE_TEXT_VALUE_CHANGE_TYPE;
    /**
     * This must resolve to a node that matches primitive value type.
     */
    pointer: JsonPointer;
    newValue: string;
}

/**
 *
 * @param pointer - Pointer to a primitive value.
 * @param newValue - New text value.
 * @returns Replace text value change.
 */
export function createReplaceTextValueChange(pointer: JsonPointer, newValue: string): ReplaceTextValue {
    return {
        type: REPLACE_TEXT_VALUE_CHANGE_TYPE,
        pointer,
        newValue
    };
}

export const UPDATE_PRIMITIVE_VALUE_CHANGE_TYPE = 'update-primitive-value';
export interface UpdatePrimitiveValue {
    type: typeof UPDATE_PRIMITIVE_VALUE_CHANGE_TYPE;
    /**
     * This must resolve to a primitive value node.
     */
    pointer: JsonPointer;
    newValue: string;
}

/**
 *
 * @param pointer - Pointer to a primitive value.
 * @param newValue - New value.
 * @returns Replace primitive value change.
 */
export function createUpdatePrimitiveValueChange(pointer: JsonPointer, newValue: string): UpdatePrimitiveValue {
    return {
        type: UPDATE_PRIMITIVE_VALUE_CHANGE_TYPE,
        pointer,
        newValue
    };
}

//#endregion

export const SET_FLAGS_CHANGE_TYPE = 'set-flags';
export interface SetFlags {
    type: typeof SET_FLAGS_CHANGE_TYPE;
    /**
     * This must resolve to a collection in which the enum flags are set.
     */
    pointer: JsonPointer;

    /**
     * A list of enum member names separated by spaces. Can also contain type information in OData format e.g Communication.PhoneType/work.
     */
    value: string;
}

/**
 *
 * @param pointer - Pointer to a enum flags node (collection).
 * @param value - A list of enum member names separated by spaces. Can also contain type information in OData format e.g Communication.PhoneType/work.
 * @returns Set flags change.
 */
export function createSetFlagsChange(pointer: JsonPointer, value: string): SetFlags {
    return {
        type: SET_FLAGS_CHANGE_TYPE,
        pointer,
        value
    };
}

export const MOVE_COLLECTION_VALUE_CHANGE_TYPE = 'move-collection-value';
export interface MoveCollectionValue {
    type: typeof MOVE_COLLECTION_VALUE_CHANGE_TYPE;
    /**
     * move before index.
     */
    index?: number;
    /**
     * Array of  eg: collection.
     */
    fromPointers: JsonPointer[];
    /**
     * This must resolve to container eg: collection.
     */
    pointer: JsonPointer;
}
/**
 *
 * @param pointer - Pointer to a container where the nodes will be moved.
 * @param fromPointers - Pointers to nodes which needs to be moved.
 * @param index - Before which child element the new element should be inserted. If omitted will be added at the end.
 * @returns Move collection value change.
 */
export function createMoveCollectionChange(
    pointer: JsonPointer,
    fromPointers: JsonPointer[],
    index?: number
): MoveCollectionValue {
    return {
        type: MOVE_COLLECTION_VALUE_CHANGE_TYPE,
        pointer,
        fromPointers,
        index
    };
}
export const CONVERT_TO_COMPOUND_ANNOTATION_CHANGE_TYPE = 'convert-to-compound-annotation';
export interface ConvertToCompoundAnnotation {
    type: typeof CONVERT_TO_COMPOUND_ANNOTATION_CHANGE_TYPE;
    /**
     * This must resolve to assignment on target.
     */
    pointer: JsonPointer;

    /**
     * If indentation should also be applied to the converted annotations
     */
    applyContentIndentation: boolean;
}

/**
 *
 * @param pointer - Pointer to an assignment.
 * @param applyContentIndentation - Flag indicating if content should be also indented.
 * @returns Convert to compound annotation change.
 */
export function createConvertToCompoundAnnotationChange(
    pointer: JsonPointer,
    applyContentIndentation: boolean
): ConvertToCompoundAnnotation {
    return {
        type: CONVERT_TO_COMPOUND_ANNOTATION_CHANGE_TYPE,
        pointer,
        applyContentIndentation
    };
}

export type CDSDocumentChange =
    | InsertTarget
    | Inserts
    | InsertQualifier
    | InsertPrimitiveValue
    | InsertReference
    | Deletes
    | ReplaceNode
    | ReplaceRecordProperty
    | ReplaceTextValue
    | UpdatePrimitiveValue
    | SetFlags
    | MoveCollectionValue
    | ConvertToCompoundAnnotation;
