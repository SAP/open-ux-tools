import type {
    AnnotationRecord,
    Collection,
    PropertyValue,
    RawAnnotation,
    Expression,
    FullyQualifiedName
} from '@sap-ux/vocabularies-types';
export enum ExpressionType {
    String = 'String',
    Bool = 'Bool',
    Decimal = 'Decimal',
    Date = 'Date',
    DateTimeOffset = 'DateTimeOffset',
    Float = 'Float',
    Guid = 'Guid',
    Int = 'Int',
    Path = 'Path',
    PropertyPath = 'PropertyPath',
    AnnotationPath = 'AnnotationPath',
    NavigationPropertyPath = 'NavigationPropertyPath',
    EnumMember = 'EnumMember',
    Collection = 'Collection',
    Record = 'Record',
    Unknown = 'Unknown',
    Null = 'Null'
}

export const MOD_TYPE_PRIMITIVE = 'primitive';
export interface PrimitiveModificationContent {
    type: typeof MOD_TYPE_PRIMITIVE;
    value: string | number | boolean;
    /**
     * AVT expression type to convert value to language specific representation
     */
    expressionType?: Expression['type'];
}
export const MOD_TYPE_EXPRESSION = 'expression';
export interface ExpressionModificationContent {
    type: typeof MOD_TYPE_EXPRESSION;
    value: Expression;
}

export interface ExpressionUpdateContent {
    type: typeof MOD_TYPE_EXPRESSION;
    value: Expression;
    /**
     * Required when expression type is changed. By default it is assumed that the type stays the same.
     */
    previousType?: Expression['type'];
}
export const MOD_TYPE_PROP_VALUE = 'property-value';
export interface PropertyValueModificationContent {
    type: typeof MOD_TYPE_PROP_VALUE;
    value: PropertyValue;
}
export const MOD_TYPE_RECORD = 'record';
export interface RecordModificationContent {
    type: typeof MOD_TYPE_RECORD;
    value: AnnotationRecord;
}
export const MOD_TYPE_COLLECTION = 'collection';
export interface CollectionModificationContent {
    type: typeof MOD_TYPE_COLLECTION;
    value: Collection;
}
export const MOD_TYPE_ANNOTATION = 'annotation';
export interface AnnotationModificationContent {
    type: typeof MOD_TYPE_ANNOTATION;
    target: FullyQualifiedName;
    value: RawAnnotation;
}

export const MOD_TYPE_EMBEDDED_ANNOTATION = 'embedded-annotation';
export interface EmbeddedAnnotationModificationContent {
    type: typeof MOD_TYPE_EMBEDDED_ANNOTATION;
    value: RawAnnotation;
}

export type UpdateContent =
    | PrimitiveModificationContent
    | ExpressionUpdateContent
    | PropertyValueModificationContent
    | RecordModificationContent
    | CollectionModificationContent;
export type InsertContent =
    | PrimitiveModificationContent
    | ExpressionModificationContent
    | PropertyValueModificationContent
    | RecordModificationContent
    | CollectionModificationContent;

export enum ChangeType {
    InsertAnnotation = 'insert-annotation',
    InsertEmbeddedAnnotation = 'insert-embedded-annotation',
    /**
     * Path should point to collection entry, property value or embedded annotation
     */
    Insert = 'insert',
    /**
     * Path should point to collection entry, property value or embedded annotation
     */
    Delete = 'delete',
    /**
     * Existing path target will be replaced; formatting/comments of original target gets lost -> only use for primitive values
     */
    Update = 'update',

    /**
     * Move elements in collection
     */
    Move = 'Move' // path should point to collection entry that is moved
}

/**
 * Pointer to a specific place inside a javascript object (see https://tools.ietf.org/html/rfc6901)
 */
export type JsonPointer = string;
export interface AnnotationReference {
    /**
     * Fully qualified target path (using namespace).
     */
    target: string;
    /**
     * Fully qualified term name (using namespace).
     */
    term: string;
    qualifier?: string;
}

export interface InsertAnnotationChange {
    kind: ChangeType.InsertAnnotation;
    uri: string;
    /**
     *  Content which shall be inserted
     */
    content: AnnotationModificationContent;
}

export interface InsertEmbeddedAnnotationChange {
    kind: ChangeType.InsertEmbeddedAnnotation;
    uri: string;
    reference: AnnotationReference;
    /**
     * Relative pointer from annotation.
     */
    pointer: JsonPointer;
    /**
     *  Content which shall be inserted
     */
    content: EmbeddedAnnotationModificationContent;
    /**
     * Element index before which the annotation should be inserted.
     * 0 based. If not specified will insert after the last element.
     */
    index?: number;
}

export interface InsertChange {
    kind: ChangeType.Insert;
    uri: string;
    /**
     * Relative pointer from annotation.
     */
    pointer: JsonPointer;
    /**
     * Element index before which the other element(s) should be moved.
     * 0 based. If not specified will move after the last element.
     */
    index?: number;
    reference: AnnotationReference;
    /**
     *  Content which shall be inserted
     */
    content: InsertContent;
}

export interface UpdateChange {
    kind: ChangeType.Update;
    uri: string;
    /**
     * Relative pointer from annotation.
     */
    pointer: JsonPointer;
    reference: AnnotationReference;
    /**
     *  Content which shall be updated
     */
    content: UpdateContent;
}

export interface DeleteChange {
    kind: ChangeType.Delete;
    uri: string;
    /**
     * Relative pointer from annotation.
     */
    pointer: JsonPointer;
    reference: AnnotationReference;
}

export interface MoveChange {
    kind: ChangeType.Move;
    reference: AnnotationReference;
    uri: string;
    pointer: JsonPointer; // to pointer, where the collection value is moved to.
    /**
     * Element index before which the other element(s) should be moved.
     * 0 based. If not specified will move after the last element.
     */
    index?: number;
    moveReference: MoveReference[]; // move from pointer and reference if the parent is different from to pointer
}

export interface MoveReference {
    reference?: AnnotationReference; // will be undefined if parent of from is same as to
    fromPointer: JsonPointer[];
}

/**
 * Represents a change of an annotation value
 */
export type Change =
    | InsertChange
    | UpdateChange
    | DeleteChange
    | InsertAnnotationChange
    | InsertEmbeddedAnnotationChange
    | MoveChange;
