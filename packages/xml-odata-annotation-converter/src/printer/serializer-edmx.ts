import type {
    Element,
    Attribute,
    Target,
    NoUndefinedNamespaceData,
    Position,
    AliasInformation,
    FileContent,
    NamespaceString
} from '@sap-ux/odata-annotation-core';
import {
    createElementNode,
    createAttributeNode,
    createTextNode,
    Edm,
    Edmx,
    printOptions,
    getIndentLevel,
    indent
} from '@sap-ux/odata-annotation-core';

import type { NamespaceAliasMap } from './csdl-to-xml';
import { printCsdlNodeToXmlString } from './csdl-to-xml';
import type { Vocabulary } from '@sap-ux/odata-vocabularies';
import { EDMX_V4_NAMESPACE, EDM_V4_NAMESPACE } from './namespaces';

const namespaces: NamespaceAliasMap = {
    Edmx: 'edmx'
};

/**
 * Serializes reference.
 *
 * @param data namespace data (must not be undefined)
 * @param parentStartPosition
 * @returns string
 */
export function serializeReference(data: NoUndefinedNamespaceData, parentStartPosition = -1): string {
    const includeSnippet = createElementNode({
        name: Edmx.Include,
        namespaceAlias: 'Edmx',
        attributes: {
            [Edmx.Namespace]: createAttributeNode(Edmx.Namespace, data.namespace)
        }
    });
    if (data.alias) {
        includeSnippet.attributes[Edmx.Alias] = createAttributeNode(Edmx.Alias, data.alias);
    }

    const snippet = createElementNode({
        name: Edmx.Reference,
        namespaceAlias: 'Edmx',
        content: [includeSnippet],
        attributes: {
            [Edmx.Uri]: createAttributeNode(Edmx.Uri, data.referenceUri)
        }
    });

    const indentLevel = getIndentLevel(parentStartPosition, printOptions.tabWidth) + 1;
    return (
        '\n' +
        printCsdlNodeToXmlString(snippet, printOptions, {
            cursorIndentLevel: indentLevel,
            namespaces
        })
    );
}

/**
 * Serializes attribute.
 *
 * @param attribute
 * @returns string
 */
export function serializeAttribute(attribute: Attribute): string {
    return attribute.name + '="' + attribute.value + '"';
}

/**
 * Serializes element.
 *
 * @param element
 * @param parentElementStartPosition
 * @returns string
 */
export function serializeElement(element: Element, parentElementStartPosition = -1): string {
    const indentLevel = getIndentLevel(parentElementStartPosition, printOptions.tabWidth) + 1;
    return '\n' + printCsdlNodeToXmlString(element, printOptions, { cursorIndentLevel: indentLevel });
}

/**
 * Serializes target.
 *
 * @param target
 * @param parentStartPostition
 * @returns string
 */
export function serializeTarget(target: Target, parentStartPostition = 0): string {
    const indentLevel = getIndentLevel(parentStartPostition, printOptions.tabWidth) + 1;
    const terms = printCsdlNodeToXmlString(target.terms, printOptions, {
        cursorIndentLevel: indentLevel + 1
    });
    const annotationTargetSnippet = createElementNode({
        name: Edm.Annotations,
        attributes: {
            [Edm.Target]: createAttributeNode(Edm.Target, target.name)
        },
        content: [createTextNode(terms)]
    });

    return (
        '\n' +
        printCsdlNodeToXmlString(annotationTargetSnippet, printOptions, {
            cursorIndentLevel: indentLevel
        })
    );
}

/**
 * Creates new annotation file object.
 *
 * @param aliasInfo
 * @param metadataUri
 * @param vocabularies
 * @returns annotation file object
 */
export function getNewAnnotationFile(
    aliasInfo: AliasInformation,
    metadataUri: string,
    vocabularies: Map<NamespaceString, Vocabulary>
): { fileContent: FileContent; position: Position } {
    // build map with all edmx references
    const references: Map<string, { alias: string; uri: string }> = new Map();
    Object.keys(aliasInfo.aliasMap).forEach((nsOrAlias) => {
        if (aliasInfo.aliasMap[nsOrAlias] === nsOrAlias) {
            collectReferences(references, vocabularies, aliasInfo, nsOrAlias, metadataUri);
        } else if (nsOrAlias !== aliasInfo.currentFileAlias) {
            // alias
            if (!references.has(aliasInfo.aliasMap[nsOrAlias])) {
                references.set(aliasInfo.aliasMap[nsOrAlias], { alias: '', uri: '' });
            }
            const aliasMap = references.get(aliasInfo.aliasMap[nsOrAlias]);
            if (aliasMap) {
                aliasMap.alias = nsOrAlias;
            }
        }
    });
    // build references EDMX snippet
    let referencesSnippet = '';
    references.forEach((value, namespace) => {
        const alias = value.alias;
        const referenceUri = value.uri;
        const data: NoUndefinedNamespaceData = {
            alias,
            namespace,
            referenceUri
        };
        referencesSnippet += serializeReference(data, 0);
    });
    const schemaSnippet = createElementNode({
        name: Edm.Schema,
        attributes: {
            ['xmlns']: createAttributeNode('xmlns', EDM_V4_NAMESPACE),
            [Edm.Namespace]: createAttributeNode(Edm.Namespace, aliasInfo.currentFileNamespace)
        },
        content: [
            createTextNode(
                '\n' +
                    indent(printOptions.tabWidth, printOptions.useTabs, 3) +
                    'INSERT_TOKEN' +
                    '\n' +
                    indent(printOptions.tabWidth, printOptions.useTabs, 2)
            )
        ]
    });
    if (aliasInfo.currentFileAlias) {
        schemaSnippet.attributes[Edm.Alias] = createAttributeNode(Edm.Alias, aliasInfo.currentFileAlias);
    }

    const dataServiceSnippet = createElementNode({
        name: Edmx.DataServices,
        namespaceAlias: 'Edmx',
        content: [schemaSnippet]
    });
    const rootElement = createElementNode({
        name: Edmx.Edmx,
        namespaceAlias: 'Edmx',
        attributes: {
            ['xmlns:edmx']: createAttributeNode('xmlns:edmx', EDMX_V4_NAMESPACE),
            [Edmx.Version]: createAttributeNode(Edmx.Version, '4.0')
        },
        content: [createTextNode(referencesSnippet), dataServiceSnippet, createTextNode('\n')]
    });

    const fileContent =
        printCsdlNodeToXmlString(rootElement, printOptions, {
            cursorIndentLevel: 0,
            namespaces
        }) + '\n';

    // find position of insert token
    const { lastLine, lastCharacter } = getLastPosition(fileContent.substring(0, fileContent.indexOf('INSERT_TOKEN')));

    return {
        fileContent: fileContent.replace('INSERT_TOKEN', ''),
        position: { line: lastLine, character: lastCharacter }
    };
}

/**
 * Returns last position data in given content.
 *
 * @param fileContent
 * @returns last position data
 */
function getLastPosition(fileContent: FileContent): { lastLine: number; lastCharacter: number } {
    const contentLines = fileContent.split('\n');
    const lastLine = contentLines.length - 1;
    const lastCharacter = contentLines[lastLine].length;
    return { lastLine, lastCharacter };
}

/**
 * Collects references.
 *
 * @param references references map
 * @param vocabularies vocabularies map
 * @param aliasInfo alias information
 * @param nsOrAlias namespace or alias
 * @param metadataUri md uri
 */
function collectReferences(
    references: Map<string, { alias: string; uri: string }>,
    vocabularies: Map<NamespaceString, Vocabulary>,
    aliasInfo: AliasInformation,
    nsOrAlias: string,
    metadataUri: string
): void {
    // namespace
    if (nsOrAlias !== aliasInfo.currentFileNamespace) {
        if (!references.has(nsOrAlias)) {
            references.set(nsOrAlias, { alias: '', uri: '' });
        }
        const reference = references.get(nsOrAlias);
        if (reference) {
            const vocabulary = vocabularies.get(nsOrAlias);
            if (vocabulary) {
                reference.uri = vocabulary?.defaultUri;
                if (!reference.alias) {
                    reference.alias = vocabulary.defaultAlias;
                }
            } else {
                reference.uri = metadataUri; // TODO support multiple metadata Uris
            }
        }
    }
}
