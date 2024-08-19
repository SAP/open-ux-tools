import type { AnyNode, Element, TextNode } from '@sap-ux/odata-annotation-core-types';
import { ANNOTATION_FILE_TYPE, ELEMENT_TYPE, Edm, TARGET_TYPE, TEXT_TYPE } from '@sap-ux/odata-annotation-core-types';

import { parsePath } from '@sap-ux/odata-annotation-core';

/**
 * Collects namespaces that are used in the subtree of the document.
 *
 * @param element - Subtree root element.
 * @param namespacesOrAliases - Set to which add used namespaces or aliases.
 */
export function collectUsedNamespaces(element: AnyNode, namespacesOrAliases: Set<string>): void {
    switch (element.type) {
        case ANNOTATION_FILE_TYPE: {
            for (const target of element.targets) {
                collectUsedNamespaces(target, namespacesOrAliases);
            }
            break;
        }
        case TARGET_TYPE: {
            if (element.name) {
                processPath(element.name, namespacesOrAliases);
            }
            for (const term of element.terms) {
                collectUsedNamespaces(term, namespacesOrAliases);
            }
            break;
        }
        case ELEMENT_TYPE: {
            processElement(element, namespacesOrAliases);
            break;
        }
        default:
            break;
    }
}

const PATH_LIKE_VALUES: string[] = [Edm.Path, Edm.PropertyPath, Edm.NavigationPropertyPath, Edm.AnnotationPath];

function processElement(element: Element, namespacesOrAliases: Set<string>): void {
    if (element.name === Edm.Annotation) {
        const term = element.attributes[Edm.Term];
        if (term?.value) {
            processPath(term.value, namespacesOrAliases);
        }
    }
    if (element.name === Edm.Record) {
        const type = element.attributes[Edm.Type];
        if (type?.value) {
            processPath(type.value, namespacesOrAliases);
        }
    }
    if (element.name === Edm.PropertyValue || element.name === Edm.Annotation) {
        const type = element.attributes[Edm.EnumMember];
        if (type?.value) {
            processPath(type.value, namespacesOrAliases);
        }
    }
    processPathLikeElement(element, namespacesOrAliases);
}

function processPathLikeElement(element: Element, namespacesOrAliases: Set<string>): void {
    if (PATH_LIKE_VALUES.includes(element.name)) {
        const textNode = element.content.find((node): node is TextNode => node.type === TEXT_TYPE);
        if (textNode) {
            processPath(textNode.text, namespacesOrAliases);
        }
    } else {
        for (const attributeName of PATH_LIKE_VALUES) {
            const attribute = element.attributes[attributeName];
            if (attribute?.value) {
                processPath(attribute.value, namespacesOrAliases);
            }
        }
        for (const child of element.content) {
            collectUsedNamespaces(child, namespacesOrAliases);
        }
    }
}

function processPath(rawPath: string, namespacesOrAliases: Set<string>): void {
    const path = parsePath(rawPath);
    for (const segment of path.segments) {
        if (segment.namespaceOrAlias) {
            namespacesOrAliases.add(segment.namespaceOrAlias);
        }
    }
}
