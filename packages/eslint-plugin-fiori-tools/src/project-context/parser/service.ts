import type { Element, MetadataElement } from '@sap-ux/odata-annotation-core';
import {
    Edm,
    getAliasInformation,
    getAllNamespacesAndReferences,
    getElementAttribute,
    getElementAttributeValue,
    parseIdentifier,
    toFullyQualifiedName
} from '@sap-ux/odata-annotation-core';
import type { ServiceArtifacts } from '@sap-ux/fiori-annotation-api/src/types';

import type { DocumentType } from '../types';

export interface ServiceIndex {
    entityContainer?: MetadataElement;
    /**
     * Key is simple identifier as it would be used in context path by SAP Fiori elements.
     */
    entitySets: Record<string, MetadataElement>;

    annotations: AnnotationIndex;
}

export interface AnnotationIndex {
    [key: string]: {
        [qualifier: string]: IndexedAnnotation;
    };
}

export interface IndexedAnnotation {
    target: string;
    term: string;
    qualifier?: string;
    source: string;
    top: AnnotationReference;
    layers: AnnotationReference[];
}

export interface AnnotationReference {
    uri: string;
    value: Element;
}

/**
 *
 * @param target
 * @param term
 * @returns
 */
export function buildAnnotationIndexKey(target: string, term: string): string {
    return `${target}/@${term}`;
}

/**
 *
 * @param service
 * @returns
 */
function indexAnnotationsByAnnotationPath(service: ServiceArtifacts): AnnotationIndex {
    const index: AnnotationIndex = {};
    for (const file of service.fileSequence) {
        const annotationFile = service.annotationFiles[file];
        if (!annotationFile) {
            continue;
            // TODO: log warning?
        }
        const namespace = annotationFile.namespace ?? { name: 'DEFAULT_NAMESPACE', type: 'namespace' };
        const namespaces = getAllNamespacesAndReferences(namespace, annotationFile.references);

        const aliasInfo = getAliasInformation(namespaces, service.metadataService.getNamespaces());
        for (const target of annotationFile.targets) {
            // TODO: handle cds common default namespace
            const targetName = toFullyQualifiedName(aliasInfo.aliasMap, namespace.name, parseIdentifier(target.name));
            if (!targetName) {
                continue;
                // TODO: log warning?
            }
            for (const annotation of target.terms) {
                const term = getElementAttributeValue(annotation, Edm.Term);
                const qualifier = getElementAttribute(annotation, Edm.Qualifier);

                const termName = toFullyQualifiedName(aliasInfo.aliasMap, namespace.name, parseIdentifier(term));
                if (!termName) {
                    continue;
                    // TODO: log warning?
                }
                const termKey = buildAnnotationIndexKey(targetName, termName);
                index[termKey] ??= {};
                const qualifierKey = qualifier?.value ?? 'undefined';
                const indexedValue = index[termKey][qualifierKey];
                const reference: AnnotationReference = {
                    uri: annotationFile.uri,
                    value: annotation
                };
                if (indexedValue) {
                    indexedValue.top = reference;
                    indexedValue.layers.unshift(reference);
                } else {
                    const reference: AnnotationReference = {
                        uri: annotationFile.uri,
                        value: annotation
                    };
                    index[termKey][qualifierKey] = {
                        source: annotationFile.uri,
                        target: targetName,
                        term: termName,
                        qualifier: qualifier?.value,
                        top: reference,
                        layers: [reference]
                    };
                }
            }
        }
    }
    return index;
}

/**
 *
 * @param artifacts
 */
export function buildServiceIndex(
    artifacts: ServiceArtifacts,
    documents: { [key: string]: DocumentType }
): ServiceIndex {
    const entitySets: Record<string, MetadataElement> = {};
    for (const document of Object.values(artifacts.annotationFiles)) {
        documents[document.uri] = document;
    }

    const annotationIndex = indexAnnotationsByAnnotationPath(artifacts);
    let entityContainer: MetadataElement | undefined;
    artifacts.metadataService.visitMetadataElements((element) => {
        // TODO: check if we can handle CDS differences better
        if (element.kind === 'EntityContainer' || element.kind === 'service') {
            entityContainer = element;
        } else if (element.kind === 'EntitySet' || element.kind === 'entitySet') {
            entitySets[element.name] = element;
        }
    });
    return {
        entitySets: entitySets,
        entityContainer,
        annotations: annotationIndex
    };
}
