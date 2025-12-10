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
import { CdsProvider, getXmlServiceArtifacts } from '@sap-ux/fiori-annotation-api';
import { ServiceArtifacts } from '@sap-ux/fiori-annotation-api/src/types';

import { ODataService } from './manifest';
import { DocumentType } from '../types';
import { uniformUrl } from '../utils';

export interface ServiceIndex {
    path: string;
    projectRoot: string;
    sourceKind: 'local-xml' | 'local-cap';
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

const serviceCache: Record<string, Record<string, ServiceIndex>> = {};

export function reIndexCdsService(
    uri: string,
    index: ServiceIndex,
    documents: { [key: string]: DocumentType },
    fileCache: Map<string, string>,
    invalidateCdsCache: boolean
): ServiceIndex[] {
    let uriBelongsToService = false;
    for (const file of index.fileSequence) {
        if (file === uri) {
            uriBelongsToService = true;
            break;
        }
    }
    if (!uriBelongsToService) {
        return [index];
    }
    return indexCdsService(index.projectRoot, documents, fileCache, invalidateCdsCache);
}

export function indexCdsService(
    projectRootPath: string,
    documents: { [key: string]: DocumentType },
    fileCache: Map<string, string>,
    invalidateCdsCache: boolean
): ServiceIndex[] {
    console.log('Indexing CDS service for project root:', projectRootPath);
    const artifacts = CdsProvider.getCdsServiceArtifacts(projectRootPath, fileCache, invalidateCdsCache);
    console.log(
        'Found CDS services:',
        artifacts.map((a) => a.path)
    );
    const cachedValue = serviceCache[projectRootPath];
    if (cachedValue && !invalidateCdsCache) {
        console.log('Using cached CDS service indices for project root:', projectRootPath);
        return [...Object.values(cachedValue)];
    }
    serviceCache[projectRootPath] ??= {};
    const indices = [];
    for (const artifact of artifacts) {
        const cdsServiceIndex = buildServiceIndex('local-cap', projectRootPath, artifact, documents);
        serviceCache[projectRootPath][artifact.path] = cdsServiceIndex;
        indices.push(cdsServiceIndex);
    }
    return indices;
}

export function indexCachedServiceWithLocalData(
    projectRoot: string,
    service: ODataService,
    documents: { [key: string]: DocumentType },
    fileCache: Map<string, string>
): ServiceIndex | undefined {
    if (!service.metadata) {
        return;
    }
    const artifacts = getXmlServiceArtifacts(
        service.version,
        uniformUrl(service.path),
        { uri: service.metadata.uri, isReadOnly: true },
        service.annotationFiles.map((file) => ({ uri: file.uri, isReadOnly: file.type === 'remote' })),
        fileCache
    );
    return buildServiceIndex('local-cap', projectRoot, artifacts, documents);
}

function buildServiceIndex(
    sourceKind: 'local-xml' | 'local-cap',
    projectRoot: string,
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
        sourceKind,
        projectRoot,
        ...artifacts,
        entitySets: entitySets,
        entityContainer,
        annotations: annotationIndex
    };
}
