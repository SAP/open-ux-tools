import {
    AnnotationFile,
    Edm,
    getAliasInformation,
    getAllNamespacesAndReferences,
    getElementAttribute,
    getElementAttributeValue,
    parseIdentifier,
    toFullyQualifiedName,
    Element,
    MetadataElement
} from '@sap-ux/odata-annotation-core';
import { MetadataService } from '@sap-ux/odata-entity-model';
import { CdsAnnotationProvider, getXmlServiceArtifacts } from '@sap-ux/fiori-annotation-api';
import { ServiceArtifacts } from '@sap-ux/fiori-annotation-api/src/types';

import { DocumentType } from '../types';
import { uniformUrl } from '../utils';

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
    top: Element;
    layers: Element[];
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
 * @param files
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
                if (indexedValue) {
                    indexedValue.top = annotation;
                    indexedValue.layers.unshift(annotation);
                } else {
                    index[termKey][qualifierKey] = {
                        source: annotationFile.uri,
                        target: targetName,
                        term: termName,
                        qualifier: qualifier?.value,
                        top: annotation,
                        layers: [annotation]
                    };
                }
            }
        }
    }
    return index;
}

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
