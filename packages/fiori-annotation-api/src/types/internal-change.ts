import type { Target, Element, TextNode, ElementChild } from '@sap-ux/odata-annotation-core-types';

import type { JsonPointer } from './change';

// change objects describing edits in generic format

export const DELETE_REFERENCE = 'delete-reference';
export interface DeleteReference {
    type: typeof DELETE_REFERENCE;
    uri: string;
    index: number;
}

export const INSERT_TARGET = 'insert-target';
export interface InsertTarget {
    type: typeof INSERT_TARGET;
    uri: string;
    target: Target;
    index?: number;
}

export const INSERT_ELEMENT = 'insert-element';
export interface InsertElement {
    type: typeof INSERT_ELEMENT;
    target: string;
    uri: string;
    pointer: JsonPointer;
    element: Element;
    index?: number;
}
export const INSERT_ATTRIBUTE = 'insert-attribute';
export interface InsertAttribute {
    type: typeof INSERT_ATTRIBUTE;
    uri: string;
    pointer: JsonPointer;
    name: string;
    value: string;
}
export const UPDATE_ATTRIBUTE_VALUE = 'update-attribute-value';

export interface UpdateAttributeValue {
    type: typeof UPDATE_ATTRIBUTE_VALUE;
    uri: string;
    pointer: JsonPointer;
    newValue: string;
}

export const UPDATE_ELEMENT_NAME = 'update-element-name';
export interface UpdateElementName {
    type: typeof UPDATE_ELEMENT_NAME;
    uri: string;
    pointer: JsonPointer;
    newValue: string;
}

export const REPLACE_ELEMENT_CONTENT = 'replace-element-content';

export interface ReplaceElementContent {
    type: typeof REPLACE_ELEMENT_CONTENT;
    uri: string;
    pointer: JsonPointer;
    newValue: ElementChild[];
}

export const REPLACE_ATTRIBUTE = 'replace-attribute';
export interface ReplaceAttribute {
    type: typeof REPLACE_ATTRIBUTE;
    uri: string;
    pointer: JsonPointer;
    newAttributeName: string;
    newAttributeValue: string;
}

export const REPLACE_ELEMENT = 'replace-element';
export interface ReplaceElement {
    type: typeof REPLACE_ELEMENT;
    uri: string;
    pointer: JsonPointer;
    newElement: Element;
}

export const DELETE_ATTRIBUTE = 'delete-attribute';
export interface DeleteAttribute {
    type: typeof DELETE_ATTRIBUTE;
    uri: string;
    pointer: JsonPointer;
}

export const DELETE_ELEMENT = 'delete-element';
export interface DeleteElement {
    type: typeof DELETE_ELEMENT;
    uri: string;
    target?: string; // Edmx target string needed for deletion of target
    pointer: JsonPointer;
}

export const MOVE_ELEMENT = 'move-element';
export interface MoveElements {
    type: typeof MOVE_ELEMENT;
    uri: string;
    fromPointers: JsonPointer[];
    pointer: JsonPointer;
    index?: number;
}

export const REPLACE_TEXT = 'replace-text';
export interface ReplaceText {
    type: typeof REPLACE_TEXT;
    uri: string;
    pointer: JsonPointer;
    text: TextNode;
}

export type AnnotationFileChange =
    | InsertTarget
    | InsertElement
    | InsertAttribute
    | UpdateAttributeValue
    | UpdateElementName
    | ReplaceElementContent
    | ReplaceElement
    | ReplaceAttribute
    | DeleteReference
    | DeleteElement
    | DeleteAttribute
    // elements in collection only
    | MoveElements
    | ReplaceText;
