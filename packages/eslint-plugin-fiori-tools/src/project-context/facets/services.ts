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
import { ODataService } from './manifest';
import { getXmlServiceArtifacts } from '@sap-ux/fiori-annotation-api';
import { ServiceArtifacts } from '@sap-ux/fiori-annotation-api/src/types';
import { DocumentType } from '../types';

export interface ServiceIndex {
    path: string;
    metadataService: MetadataService;
    entityContainer?: MetadataElement;
    /**
     * Key is simple identifier as it would be used in context path by SAP Fiori elements.
     */
    entitySets: Record<string, MetadataElement>;
    annotationFiles: Record<string, AnnotationFile>;
    fileSequence: string[];
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
    return `${target}@${term}`;
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

export function indexCachedService(
    service: ODataService,
    documents: { [key: string]: DocumentType },
    fileCache: Map<string, string>
): ServiceIndex {
    if (!service.metadata) {
        throw new Error(`Cannot index service ${service.name} without metadata file.`);
    }
    const entitySets: Record<string, MetadataElement> = {};
    const artifacts = getXmlServiceArtifacts(
        service.version,
        { uri: service.metadata.uri, isReadOnly: true },
        service.annotationFiles.map((file) => ({ uri: file.uri, isReadOnly: file.type === 'remote' })),
        fileCache
    );
    for (const document of Object.values(artifacts.annotationFiles)) {
        documents[document.uri] = document;
    }

    const annotationIndex = indexAnnotationsByAnnotationPath(artifacts);
    let entityContainer: MetadataElement | undefined;
    artifacts.metadataService.visitMetadataElements((element) => {
        if (element.kind === 'EntityContainer') {
            entityContainer = element;
        } else if (element.kind === 'EntitySet') {
            entitySets[element.name] = element;
        }
    });
    return {
        path: service.path,
        ...artifacts,
        entitySets: entitySets,
        entityContainer,
        annotations: annotationIndex
    };
}
