import type { Element, MetadataElement, Range, Target } from '@sap-ux/odata-annotation-core';
import {
    Edm,
    getAliasInformation,
    getAllNamespacesAndReferences,
    getElementAttribute,
    getElementAttributeValue,
    parseIdentifier,
    toFullyQualifiedName,
    createAttributeNode,
    createElementNode
} from '@sap-ux/odata-annotation-core';
import type { ServiceArtifacts } from '@sap-ux/fiori-annotation-api/src/types';

import type { DocumentType } from '../types';
import { COMMON_LABEL, COMMON_TEXT } from '../../constants';

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
 * Builds an annotation index key from target and term.
 *
 * @param target - The annotation target
 * @param term - The annotation term
 * @returns The index key in format "target/@term"
 */
export function buildAnnotationIndexKey(target: string, term: string): string {
    return `${target}/@${term}`;
}

/**
 * Indexes annotations by their annotation path (target and term).
 *
 * @param service - Service artifacts containing annotation files
 * @returns Annotation index organized by path and qualifier
 */
function indexAnnotationsByAnnotationPath(service: ServiceArtifacts): AnnotationIndex {
    const index: AnnotationIndex = {};
    for (const file of service.fileSequence) {
        const annotationFile = service.annotationFiles[file];
        if (!annotationFile) {
            continue;
        }
        const namespace = annotationFile.namespace ?? { name: 'DEFAULT_NAMESPACE', type: 'namespace' };
        const namespaces = getAllNamespacesAndReferences(namespace, annotationFile.references);

        const aliasInfo = getAliasInformation(namespaces, service.metadataService.getNamespaces());
        for (const target of annotationFile.targets) {
            const targetName = toFullyQualifiedName(aliasInfo.aliasMap, namespace.name, parseIdentifier(target.name));
            if (!targetName) {
                continue;
            }
            processTargetAnnotations(target, annotationFile, namespace, aliasInfo, targetName, index);
        }
    }
    return index;
}

/**
 * Processes annotations for a specific target and adds them to the index.
 *
 * @param target - The annotation target to process
 * @param annotationFile - The annotation file containing the target
 * @param namespace - Namespace information
 * @param aliasInfo - Alias information for resolving qualified names
 * @param targetName - Fully qualified target name
 * @param index - Annotation index to update
 */
function processTargetAnnotations(
    target: any,
    annotationFile: any,
    namespace: any,
    aliasInfo: any,
    targetName: string,
    index: AnnotationIndex
): void {
    for (const annotation of target.terms) {
        const term = getElementAttributeValue(annotation, Edm.Term);
        const qualifier = getElementAttribute(annotation, Edm.Qualifier);

        const termName = toFullyQualifiedName(aliasInfo.aliasMap, namespace.name, parseIdentifier(term));
        if (!termName) {
            continue;
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

/**
 * Creates a minimal synthetic Element node carrying a single string attribute.
 * Attaches an ESLint-compatible `loc` object when source range is available,
 * enabling ESLint to report at the correct line/column in the metadata file.
 *
 * @param attrName - Attribute name on the Annotation element (e.g. "Path" or "String")
 * @param attrValue - Attribute value
 * @param sourceRange - Optional source range (0-indexed) used for ESLint reporting
 * @returns A synthetic Element, optionally with position range
 */
function createSyntheticElement(attrName: string, attrValue: string, sourceRange?: Range): Element {
    const element = createElementNode({
        name: Edm.Annotation,
        attributes: {
            [attrName]: createAttributeNode(attrName, attrValue)
        },
        content: []
    });
    if (sourceRange) {
        element.range = sourceRange;
    }
    return element;
}

/**
 * Injects synthetic Common.Text and Common.Label annotation entries derived from OData V2
 * inline `sap:text` and `sap:label` attributes on Property elements.
 *
 * For Common.Text: injects into both the annotation index AND the annotation file AST so
 * that ESLint's `createAnnotations()` traversal can fire and report diagnostics.
 * For Common.Label: injects into the annotation index only (read by getLabelForProperty).
 *
 * Only adds entries when no explicit vocabulary annotation already exists for that key.
 *
 * @param artifacts - Service artifacts whose metadata properties are to be inspected
 * @param metadataUri - URI of the metadata file (used as the annotation source)
 * @param index - The annotation index to inject into
 */
function injectV2InlineAnnotations(artifacts: ServiceArtifacts, metadataUri: string, index: AnnotationIndex): void {
    if (artifacts.metadataService.ODataVersion !== '2.0') {
        return;
    }
    const annotationFile = artifacts.annotationFiles[metadataUri];
    if (!annotationFile) {
        return;
    }

    artifacts.metadataService.visitMetadataElements((element) => {
        if (element.kind !== Edm.Property) {
            return;
        }
        const propertyTarget = element.path; // e.g. "Namespace.EntityType/PropertyName"

        if (element.sapText) {
            const textKey = buildAnnotationIndexKey(propertyTarget, COMMON_TEXT);
            if (!index[textKey]) {
                const syntheticElement = createSyntheticElement(Edm.Path, element.sapText, element.sapTextRange);
                index[textKey] = {
                    undefined: {
                        source: metadataUri,
                        target: propertyTarget,
                        term: COMMON_TEXT,
                        top: { uri: metadataUri, value: syntheticElement },
                        layers: [{ uri: metadataUri, value: syntheticElement }]
                    }
                };
                // Also inject into the annotation file AST so the traversal selector fires
                const syntheticTarget: Target = {
                    type: 'target',
                    name: propertyTarget,
                    terms: [syntheticElement]
                };
                annotationFile.targets.push(syntheticTarget);
            }
        }

        if (element.sapLabel) {
            const labelKey = buildAnnotationIndexKey(propertyTarget, COMMON_LABEL);
            if (!index[labelKey]) {
                const syntheticElement = createSyntheticElement(Edm.String, element.sapLabel, element.sapLabelRange);
                index[labelKey] = {
                    undefined: {
                        source: metadataUri,
                        target: propertyTarget,
                        term: COMMON_LABEL,
                        top: { uri: metadataUri, value: syntheticElement },
                        layers: [{ uri: metadataUri, value: syntheticElement }]
                    }
                };
            }
        }
    });
}

/**
 * Builds a service index from service artifacts.
 * Creates indexes for entity sets, entity containers, and annotations.
 * For OData V2 services, also injects synthetic index entries and AST targets from
 * inline sap:text/sap:label attributes so that annotation rules can report on metadata.xml.
 *
 * @param artifacts - Service artifacts to index
 * @param documents - Document map to populate with annotation files
 * @returns Complete service index with entity sets and annotations
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
    let metadataUri = '';
    artifacts.metadataService.visitMetadataElements((element) => {
        // NOSONAR - TODO: check if we can handle CDS differences better
        if (element.kind === 'EntityContainer' || element.kind === 'service') {
            entityContainer = element;
        } else if (element.kind === 'EntitySet' || element.kind === 'entitySet') {
            entitySets[element.name] = element;
        }
        if (!metadataUri && element.location?.uri) {
            metadataUri = element.location.uri;
        }
    });

    injectV2InlineAnnotations(artifacts, metadataUri, annotationIndex);

    return {
        entitySets: entitySets,
        entityContainer,
        annotations: annotationIndex
    };
}
