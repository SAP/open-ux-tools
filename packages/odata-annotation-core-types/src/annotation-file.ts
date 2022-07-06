import type { Range } from 'vscode-languageserver-types';

export interface Node {
    type: string;
    range?: Range;
}
export const ATTRIBUTE_TYPE = 'attribute';

export interface Attribute {
    type: typeof ATTRIBUTE_TYPE;
    name: string;
    value: string;
    nameRange?: Range;
    valueRange?: Range;
}

export interface Attributes {
    [name: string]: Attribute;
}

export const TEXT_TYPE = 'text';

export interface TextNode extends Node {
    type: typeof TEXT_TYPE;
    text: string;
    /**
     * Original ranges for structured text (e.g. multiple enum values, paths).
     * Used e.g. for diagnostics and goto references to provide specific range.
     */
    fragmentRanges?: Range[];
}

export type ElementChild = TextNode | Element;
export const ELEMENT_TYPE = 'element';

export const EDMX_NAMESPACE_ALIAS = 'Edmx';
export const EDM_NAMESPACE_ALIAS = 'Edm';

export type ODataNamespaceAlias = typeof EDMX_NAMESPACE_ALIAS | typeof EDM_NAMESPACE_ALIAS;
export interface Element extends Node {
    type: typeof ELEMENT_TYPE;
    name: string;
    /**
     * If omitted, then default http://docs.oasis-open.org/odata/ns/edm namespace is implied.
     */
    namespace?: string;
    nameRange?: Range;
    /**
     * @default "Edm"
     */
    namespaceAlias?: ODataNamespaceAlias | string;
    attributes: Attributes;
    content: ElementChild[];
    /**
     * End of opening tag till start of closing tag.
     */
    contentRange?: Range;
}

export const REFERENCE_TYPE = 'reference';

/**
 * Outer structure and annotation file itself
 */
// content of 'edmx:Reference' element
export interface Reference extends Node {
    type: typeof REFERENCE_TYPE;
    name: string; // for CDS this can also be any fully qualified name or empty (e.g. for: using from './otherFile')
    nameRange?: Range; // <Include> tag's Namespace attribute value range
    alias?: string;
    aliasRange?: Range; // <Include> tag's Alias attribute value range
    /**
     * Uri to the source of the reference
     */
    uri?: string;
    uriRange?: Range;
}

export const TARGET_TYPE = 'target';

/**
 * Annotation with external target.
 */
export interface Target extends Node {
    type: typeof TARGET_TYPE;
    name: string; // target path
    nameRange?: Range; // range of target string
    /**
     * All annotations for this target
     */
    terms: Element[];
    /**
     * Range covering all annotations for this target
     */
    termsRange?: Range;
    /**
     * Namespace in which this annotation is defined
     */
    namespace: string;
    alias?: string;
}

export const ANNOTATION_FILE_TYPE = 'annotation-file';

/**
 * Contains references block (usings) and annotation with external targeting.
 */
export interface AnnotationFile extends Node {
    type: typeof ANNOTATION_FILE_TYPE;
    uri: string;
    contentRange?: Range;
    references: Reference[];
    targets: Target[];
}

export type AnyNode = ElementChild | Reference | AnnotationFile | Target;

export function createAttributeNode(name: string, value: string, nameRange?: Range, valueRange?: Range): Attribute {
    return {
        type: ATTRIBUTE_TYPE,
        name,
        nameRange,
        value,
        valueRange
    };
}

export function createTextNode(text: string, range?: Range, fragmentRanges?: Range[]): TextNode {
    return {
        type: TEXT_TYPE,
        range,
        text,
        fragmentRanges
    };
}

export function createElementNode(
    name: string,
    range?: Range,
    nameRange?: Range,
    attributes?: Attributes,
    content?: ElementChild[],
    contentRange?: Range,
    namespace?: string,
    namespaceAlias?: ODataNamespaceAlias | string
): Element {
    return {
        type: ELEMENT_TYPE,
        range,
        name,
        nameRange,
        attributes: attributes ?? {},
        content: content ?? [],
        contentRange,
        namespace,
        namespaceAlias
    };
}
