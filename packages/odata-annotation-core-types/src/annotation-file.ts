import type { Range } from '@sap-ux/text-document-utils';

export interface Node {
    type: string;
    range?: Range;
}

/**
 * representation of an XML node
 */
export const ATTRIBUTE_TYPE = 'attribute';

export interface Attribute extends Node {
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
    /*
     * Currently only used provided only by CDS
     */
    multilineType?: MultilineType;
}

export const enum MultilineType {
    /**
     * Processor should strip all the indentation before using the value
     */
    StripIndentation = 'StripIndentation',
    /**
     * Processor should keep the indentation as a part of the value
     */
    KeepIndentation = 'KeepIndentation'
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
 * Content of 'edmx:Reference' element or cds references
 *
 *  @property {string} name for CDS this can also be any fully qualified name or empty (e.g. for: using from './otherFile')
 *  @property {Range} nameRange  <Include> tag's Namespace attribute value range
 *  @property {Range} aliasRange <Include> tag's Alias attribute value range
 *  @property {FileUri} uri  Uri to the source of the reference, filled for Namespaces representing CDS 'using' statements; absolute uri
 */
export interface Reference extends Node {
    type: typeof REFERENCE_TYPE;
    name: string;
    nameRange?: Range;
    alias?: string;
    aliasRange?: Range;
    uri?: FileUri;
    uriRange?: Range;
}

export const NAMESPACE_TYPE = 'namespace';
/**
 * Namespace of current document
 *
 *  @property {string} name  Full namespace name
 *  @property {Range} nameRange  Range of the namespace name
 */
export interface Namespace extends Node {
    type: typeof NAMESPACE_TYPE;
    name: string;
    nameRange?: Range;
    contentRange?: Range;
    alias?: string;
    aliasRange?: Range;
}

export const TARGET_TYPE = 'target';

/**
 * Annotation with external target.
 *
 *  @property {string} name target path
 *  @property {Range} nameRange  range of target string
 *  @property {Element[]} terms  All annotations for this target
 *  @property {Range} termsRange  Range covering all annotations for this target
 */
export interface Target extends Node {
    type: typeof TARGET_TYPE;
    name: string;
    nameRange?: Range;

    terms: Element[];
    termsRange?: Range;
}

export const ANNOTATION_FILE_TYPE = 'annotation-file';

/**
 * Contains references block (usings) and annotation with external targeting.
 *
 *  @property {Namespace} namespace Files namespace
 *  @property {Reference[]} references  References used in the file
 *  @property {Target[]} targets  Annotations with external targeting
 */
export interface AnnotationFile extends Node {
    type: typeof ANNOTATION_FILE_TYPE;
    uri: string;
    namespace?: Namespace;
    contentRange?: Range;
    references: Reference[];
    targets: Target[];
}

export type AnyNode = ElementChild | Reference | AnnotationFile | Target | Namespace | Attribute;

/**
 * Creates attribute node.
 *
 * @param name name
 * @param value value
 * @param nameRange name range
 * @param valueRange value range
 * @returns attribute node object
 */
export function createAttributeNode(name: string, value: string, nameRange?: Range, valueRange?: Range): Attribute {
    const attribute: Attribute = {
        type: ATTRIBUTE_TYPE,
        name,
        value
    };
    if (nameRange) {
        attribute.nameRange = nameRange;
    }
    if (valueRange) {
        attribute.valueRange = valueRange;
    }
    return attribute;
}

/**
 * Creates text node.
 *
 * @param text text
 * @param range text range
 * @param fragmentRanges text fragment ranges
 * @param multilineType - multiline type
 * @returns text node object
 */
export function createTextNode(
    text: string,
    range?: Range,
    fragmentRanges?: Range[],
    multilineType?: MultilineType
): TextNode {
    const node: TextNode = { type: TEXT_TYPE, text };
    if (range) {
        node.range = range;
    }
    if (fragmentRanges) {
        node.fragmentRanges = fragmentRanges;
    }
    if (multilineType) {
        node.multilineType = multilineType;
    }
    return node;
}

/**
 * Creates element node.
 *
 * @param param0  object with parameters
 * @param param0.name  name
 * @param param0.range  range
 * @param param0.nameRange  name range
 * @param param0.attributes  attributes
 * @param param0.content  content
 * @param param0.contentRange  content range
 * @param param0.namespace  namespace
 * @param param0.namespaceAlias  alias
 * @returns Element object
 */
export function createElementNode({
    name,
    range,
    nameRange,
    attributes,
    content,
    contentRange,
    namespace,
    namespaceAlias
}: {
    name: string;
    range?: Range;
    nameRange?: Range;
    attributes?: Attributes;
    content?: ElementChild[];
    contentRange?: Range;
    namespace?: string;
    namespaceAlias?: ODataNamespaceAlias | string;
}): Element {
    const node: Element = {
        type: ELEMENT_TYPE,
        name,
        attributes: attributes ?? {},
        content: content ?? []
    };

    if (range) {
        node.range = range;
    }

    if (nameRange) {
        node.nameRange = nameRange;
    }
    if (contentRange) {
        node.contentRange = contentRange;
    }
    if (namespace) {
        node.namespace = namespace;
    }
    if (namespaceAlias) {
        node.namespaceAlias = namespaceAlias;
    }
    return node;
}

// TODO include uri in AnnotationFile and make ServiceAnnotationFile obsolete ?
export interface ServiceAnnotationFile {
    uri: string; // used as identifier to know what to overwrite in context when file has changed
    content: AnnotationFile;
    serviceName: string; // seems not be used anywhere
}

/**
 *  Interface for Component providing Generic LSP Support for Annotations
 */

export type FileUri = string; // uri identifying file in LSP

export const GHOST_FILENAME_PREFIX = '!';

export type ServiceName = string;

/**
 * Builds empty target (generic annotation file format).
 *
 * @param path - target name
 * @returns object - empty target
 */
export function createTarget(path: string): Target {
    return { type: 'target', name: path, terms: [], range: undefined, nameRange: undefined, termsRange: undefined };
}

/**
 * Builds empty namespace (generic annotation file format).
 *
 * @param namespace - namespace name
 * @param alias - alias name
 * @param ranges - object with ranges
 * @param ranges.range - element range
 * @param ranges.nameRange - name range
 * @param ranges.aliasRange alias range
 * @param ranges.contentRange - content range
 * @returns Namespace obejct
 */
export function createNamespace(
    namespace: string,
    alias?: string,
    ranges?: {
        range?: Range;
        nameRange?: Range;
        aliasRange?: Range;
        contentRange?: Range;
    }
): Namespace {
    const { aliasRange, contentRange, nameRange, range } = ranges ?? {};
    return {
        type: 'namespace',
        name: namespace,
        alias,
        range,
        nameRange,
        aliasRange,
        contentRange
    };
}

/**
 * Builds empty reference (generic annotation file format).
 *
 * @param name reference name
 * @param alias alias
 * @param uri uri
 * @param ranges object with ranges
 * @param ranges.range - element range
 * @param ranges.nameRange - name range
 * @param ranges.aliasRange alias range
 * @param ranges.uriRange - uri range
 * @returns reference onject
 */
export function createReference(
    name: string,
    alias?: string,
    uri?: string,
    ranges?: {
        range?: Range;
        nameRange?: Range;
        aliasRange?: Range;
        uriRange?: Range;
    }
): Reference {
    const { aliasRange, uriRange, nameRange, range } = ranges ?? {};
    return {
        type: 'reference',
        name,
        alias,
        uri,
        range,
        nameRange,
        aliasRange,
        uriRange
    };
}
