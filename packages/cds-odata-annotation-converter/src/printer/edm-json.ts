import type { Attributes, Element, FormatterOptions, TextNode, ElementChild } from '@sap-ux/odata-annotation-core';
import { Edm, TEXT_TYPE, ELEMENT_TYPE } from '@sap-ux/odata-annotation-core';

import { indent } from './indent';
import type { ContainerItemType } from './primitives';
import {
    collection,
    keyAlone,
    list,
    PRIMITIVE_VALUE_ATTRIBUTE_NAMES,
    stringLiteral,
    struct,
    valuePair
} from './primitives';

interface EdmJsonOptions extends FormatterOptions {
    includeEdmJson?: boolean;
    removeRootElementContainer?: boolean;
    /**
     * If set to true, then output will not be indented.
     */
    skipIndent?: boolean;
}

/**
 *
 * @param node - The node to be serialized.
 * @param options - The options for EDM JSON serialization.
 * @returns The serialized string based on the type of the node.
 */
export function printEdmJson(node: Element | TextNode, options: EdmJsonOptions): string {
    const value = internalPrint(node, options, true);
    const valueWithoutIndentation =
        options.includeEdmJson && !options.removeRootElementContainer ? wrapWithEdmJson(value, options) : value;
    if (options.skipIndent) {
        return valueWithoutIndentation;
    }
    return indent(valueWithoutIndentation);
}

/**
 * Prefixes a property name based on EDM JSON options.
 *
 * @param text - The property name to be prefixed.
 * @param options - The options for EDM JSON serialization.
 * @returns The prefixed property name.
 */
function wrapWithEdmJson(text: string, options: EdmJsonOptions): string {
    const edmJson = valuePair(prefixPropertyName('edmJson', options), text);
    return struct([edmJson]);
}

/**
 * Prefixes a property name with a dollar sign and an optional backslash.
 *
 * @param text - The original property name.
 * @param options - Options for customizing the prefixing.
 * @returns - The prefixed property name.
 */
function prefixPropertyName(text: string, options: EdmJsonOptions): string {
    return `${options.useSnippetSyntax ? '\\' : ''}$${text}`;
}

/**
 * Converts an element or text node to a serialized string based on its type.
 *
 * @param node - The node to be serialized.
 * @param options - The options for EDM JSON serialization.
 * @param [isRoot] - Indicates whether the node is the root element.
 * @returns The serialized string based on the type of the node.
 */
function internalPrint(node: Element | TextNode, options: EdmJsonOptions, isRoot = false): string {
    switch (node.type) {
        case ELEMENT_TYPE: {
            return printElement(node, options, isRoot);
        }
        case TEXT_TYPE: {
            return node.text;
        }

        default:
            return '';
    }
}

/**
 * Converts the content of an element to a serialized string based on its type.
 *
 * @param node - The element to be serialized.
 * @param options - The options for EDM JSON serialization.
 * @param isRoot - Indicates whether the element is the root element.
 * @returns The serialized string based on the type of the element.
 */
function printElement(node: Element, options: EdmJsonOptions, isRoot: boolean): string {
    if (node.name === Edm.String) {
        return printString(node);
    }

    let stringValLiteral = '';
    if (node?.content?.[0]?.type === TEXT_TYPE) {
        stringValLiteral = node.content[0].text.trim();
    }
    const content = printContent(node.content, options);
    const contentText = PRIMITIVE_VALUE_ATTRIBUTE_NAMES.has(node.name)
        ? stringLiteral(stringValLiteral)
        : collection(content);
    const name = valuePair(prefixPropertyName(node.name, options), contentText);
    const attributes = printAttributes(node.attributes, options);
    const properties = [name, ...attributes];
    if (isRoot && options.removeRootElementContainer) {
        return list(properties, false).join('\n');
    }
    return struct(properties);
}

/**
 * Converts the content of a string element to a serialized string literal.
 *
 * @param node - The string element.
 * @returns The serialized string literal.
 */
function printString(node: Element): string {
    if (node.content && node.content[0]?.type === TEXT_TYPE) {
        return stringLiteral(node.content[0].text);
    }
    return stringLiteral('');
}

/**
 * @param attributes - The content of the attribute.
 * @param options - The options for EDM JSON serialization.
 * @returns The serialized array of ContainerItemType.
 */
function printAttributes(attributes: Attributes | undefined, options: EdmJsonOptions): ContainerItemType[] {
    return Object.keys(attributes ?? {}).map((attributeName): ContainerItemType => {
        if (attributeName.startsWith('$')) {
            // placeholders need different handling
            return { value: keyAlone(attributeName), placeholder: true };
        }
        const attributeNameValue = attributes ? attributes[attributeName].value : '';
        return valuePair(prefixPropertyName(attributeName, options), stringLiteral(attributeNameValue));
    });
}

/**
 * Converts the content of an element to a serialized array of ContainerItemType.
 *
 * @param content - The content of the element.
 * @param options - The options for EDM JSON serialization.
 * @returns The serialized array of ContainerItemType.
 */
function printContent(content: ElementChild[] | undefined, options: EdmJsonOptions): ContainerItemType[] {
    return (content ?? [])
        .filter((item) => item.type !== 'text' || item.text.trim() !== '')
        .map((item: Element | TextNode): ContainerItemType => {
            if (item.type === TEXT_TYPE && item.text.startsWith('$')) {
                return {
                    value: item.text,
                    placeholder: true
                };
            }
            return internalPrint(item, options);
        });
}
