import type { Range } from 'vscode-languageserver-types';

export interface Node {
    type: string;
    range?: Range;
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

export type AnyNode = ElementChild;

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
