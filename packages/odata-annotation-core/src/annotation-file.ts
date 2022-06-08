import type { Range } from 'vscode-languageserver-types';

export interface Node {
    type: string;
    range?: Range;
}

export const DOCUMENT_TYPE = 'document';
export interface AnnotationDocument extends Node {
    type: typeof DOCUMENT_TYPE;
    uri: string;
    references: Reference[];
    content: DocumentContent;
}
export const REFERENCE_TYPE = 'reference';
export interface Reference extends Node {
    type: typeof REFERENCE_TYPE;
    uri?: string;
    imports: Import[];
}

export const IMPORT_TYPE = 'import';
export interface Import extends Node {
    type: typeof IMPORT_TYPE;
    name?: Attribute;
    alias?: Attribute;
}

export const DOCUMENT_CONTENT_TYPE = 'document-content';
export interface DocumentContent extends Node {
    type: typeof DOCUMENT_CONTENT_TYPE;
    namespace?: Attribute;
    children: ElementChild[];
}

export const ATTRIBUTE_TYPE = 'attribute';

export interface Attribute extends Node {
    type: typeof ATTRIBUTE_TYPE;
    name: string;
    value: string;
    nameRange: Range;
    valueRange: Range;
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

export type AnyNode = ElementChild | Document | DocumentContent | Import | Reference | AnnotationDocument;

/**
 * Creates AnnotationDocument node.
 *
 * @param range Range for the whole document
 * @param uri Document URI
 * @param references References node
 * @param content Content node
 * @returns AnnotationDocument node
 */
export function createAnnotationDocumentNode(
    range: Range,
    uri: string,
    references: Reference[],
    content: DocumentContent
): AnnotationDocument {
    return {
        type: DOCUMENT_TYPE,
        range,
        uri,
        references,
        content
    };
}

/**
 * Creates Reference node.
 *
 * @param range Reference node range
 * @param imports Import nodes
 * @param uri URI for the reference
 * @returns Reference node
 */
export function createReferenceNode(range: Range, imports: Import[], uri?: string): Reference {
    return {
        type: REFERENCE_TYPE,
        imports,
        range,
        uri
    };
}

/**
 * Creates Import node.
 *
 * @param range Import node range
 * @param name Imported namespace
 * @param alias Alias of the namespace
 * @returns Import node
 */
export function createImportNode(range: Range, name?: Attribute, alias?: Attribute): Import {
    return {
        type: IMPORT_TYPE,
        range,
        name,
        alias
    };
}

/**
 * Creates DocumentContent node.
 *
 * @param range DocumentContent node range
 * @param children Content nodes
 * @param namespace Namespace for the content nodes
 * @returns DocumentContent node
 */
export function createDocumentContentNode(
    range: Range,
    children: ElementChild[],
    namespace?: Attribute
): DocumentContent {
    return {
        type: DOCUMENT_CONTENT_TYPE,
        range,
        children,
        namespace
    };
}

export function createAttributeNode(
    range: Range,
    name: string,
    nameRange: Range,
    value: string,
    valueRange: Range
): Attribute {
    return {
        type: ATTRIBUTE_TYPE,
        range,
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
