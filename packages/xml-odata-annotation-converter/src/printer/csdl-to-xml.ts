/* eslint-disable @typescript-eslint/no-use-before-define */
import type { Attributes, Element, ODataNamespaceAlias, TextNode } from '@sap-ux/odata-annotation-core';
import { ELEMENT_TYPE, TEXT_TYPE, EDM_NAMESPACE_ALIAS, EDMX_NAMESPACE_ALIAS, Edm } from '@sap-ux/odata-annotation-core';

import type { Concat, Document, Options } from './builders';
import { concat, hardline, indent, line, printDocumentToString } from './builders';

// TODO: figure out how to provide only valid context for namespaces, prefixes and default combinations or validate context
export interface PrintContext {
    namespaces?: NamespaceAliasMap;
    /**
     * Number that describes how deeply nested is this element relative to the document root element
     * 0 based
     */
    cursorIndentLevel: number;
}

export const printCsdlNodeToXmlString = (snippet: Node | Node[], opts: Options, context: PrintContext): string => {
    const snippets: Node[] = Array.isArray(snippet) ? snippet : [snippet];

    const doc = concat(
        snippets.map((item, idx) =>
            concat([printCsdlRootNode(item, context), idx === snippets.length - 1 ? '' : hardline])
        )
    );
    doc.parts.forEach((part, index) => {
        for (let i = 0; i < context.cursorIndentLevel; i++) {
            doc.parts[index] = indent(doc.parts[index]);
        }
    });
    return printDocumentToString(doc, opts);
};

export interface NamespaceAliasMap {
    [EDM_NAMESPACE_ALIAS]?: string;
    [EDMX_NAMESPACE_ALIAS]?: string;
}

export const escapeText = (input: string): string => {
    if (!input || typeof input !== 'string') {
        return input;
    }
    return input.replace(/([<&])/g, (_str, item: '<' | '&') => ({ '<': '&lt;', '&': '&amp;' })[item]);
};

export const unescapeText = (input: string) => {
    if (!input || typeof input !== 'string') {
        return input;
    }
    return input.replace(/(&lt;|&amp;)/g, (_str, item: '&lt;' | '&amp;') => ({ '&lt;': '<', '&amp;': '&' })[item]);
};

export const escapeAttribute = (input: string): string => {
    if (!input || typeof input !== 'string') {
        return input;
    }
    return input.replace(
        /([<&"])/g,
        (_str, item: '<' | '&' | '"') => ({ '<': '&lt;', '&': '&amp;', '"': '&quot;' })[item]
    );
};

export const unescapeAttribute = (input: string) => {
    if (!input || typeof input !== 'string') {
        return input;
    }
    return input.replace(
        /(&lt;|&amp;|&quot;)/g,
        (_str, item: '&lt;' | '&amp;' | '&quot;') => ({ '&lt;': '<', '&amp;': '&', '&quot;': '"' })[item]
    );
};

type Node = Element | TextNode;

const printCsdlRootNode = (node: Node, context: PrintContext): Document => {
    switch (node.type) {
        case ELEMENT_TYPE: {
            return printElement(node, context);
        }
        case TEXT_TYPE:
            return printText(node, true);
        default:
            return '';
    }
};

const printCsdlNode = (node: Node, context: PrintContext): Document => {
    switch (node.type) {
        case ELEMENT_TYPE:
            return printElement(node, context);
        case TEXT_TYPE:
            return printText(node, true);
        default:
            return '';
    }
};

const join =
    (sep: string) =>
    (values: (string | undefined)[]): string =>
        values.filter((value) => value !== undefined && value !== null).join(sep);

const joinWithColon = join(':');
const prefixName = (prefix: string | undefined, name: string): string => joinWithColon([prefix, name]);
const prefixElementNameIfNeeded = (
    name: string,
    namespaceAlias: ODataNamespaceAlias,
    namespaces: NamespaceAliasMap = {}
): string => {
    switch (namespaceAlias) {
        case EDMX_NAMESPACE_ALIAS:
            return prefixName(namespaces[EDMX_NAMESPACE_ALIAS], name);
        case EDM_NAMESPACE_ALIAS:
            return prefixName(namespaces[EDM_NAMESPACE_ALIAS], name);
        default:
            return prefixName(namespaces[EDM_NAMESPACE_ALIAS], name);
    }
};

const printEmptyElement = (element: Element, context: PrintContext): Document => {
    const name = prefixElementNameIfNeeded(
        element.name,
        element.namespaceAlias as ODataNamespaceAlias,
        context.namespaces
    );
    return concat(['<', name, printAttributes(element.attributes), '/>']);
};

const printText = (node: TextNode, doEscape?: boolean): Document => {
    return doEscape ? escapeText(node.text) : node.text;
};

const printAttribute = (name: string, value: string): string => {
    if (value !== undefined && value !== null) {
        return `${name}="${escapeAttribute(value)}"`;
    }
    return name;
};

const structuredExpressions: Set<string> = new Set([
    'Annotations',
    'Annotation',
    'Collection',
    'Record',
    'PropertyValue',
    'Apply',
    'LabeledElement'
]);
const dynamicExpressions: Set<string> = new Set([
    Edm.If,
    Edm.Not,
    Edm.And,
    Edm.Or,
    Edm.Eq,
    Edm.Ne,
    Edm.Gt,
    Edm.Ge,
    Edm.Lt,
    Edm.Le,
    Edm.In
]);

const printElement = (element: Element, context: PrintContext): Document => {
    const dynamicExpression = dynamicExpressions.has(element.name);
    const structured = structuredExpressions.has(element.name) || dynamicExpression;
    if ((element.content || []).length === 0) {
        return printEmptyElement(element, context);
    }
    const textNode = element.content[0].type === TEXT_TYPE;
    const name = prefixElementNameIfNeeded(
        element.name,
        element.namespaceAlias as ODataNamespaceAlias,
        context.namespaces
    );

    const opening = concat(['<', name, printAttributes(element.attributes), '>']);
    const closing = concat(['</', name, '>']);
    const content = concatElementContent(element, structured, context);

    return concat([opening, indent(content), textNode && !structured ? '' : hardline, closing]);
};

const printAttributes = (attributes: Attributes = {}): Document => {
    const names = Object.keys(attributes);
    if (names.length === 0) {
        return '';
    }
    const parts = names.reduce(
        (accumulator: Document[], name: string) => [...accumulator, line, printAttribute(name, attributes[name].value)],
        []
    );

    return indent(concat(parts));
};

const concatElementContent = (element: Element, structured: boolean, context: PrintContext): Concat => {
    let addHardLineBeforeText = true;
    return concat(
        element.content.map((node, idx) => {
            let result;
            if (idx === 0 && node.type === ELEMENT_TYPE) {
                addHardLineBeforeText = false;
            }
            if (node.type === TEXT_TYPE) {
                const text = structured && addHardLineBeforeText ? hardline : '';
                result = concat([text, printText(node)]);
            } else {
                result = concat([hardline, printCsdlNode(node, context)]);
            }
            return result;
        })
    );
};
