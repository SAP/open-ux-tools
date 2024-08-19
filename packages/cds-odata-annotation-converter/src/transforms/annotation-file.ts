import { Position, Range } from '@sap-ux/text-document-utils';
import { copyRange, copyPosition, ANNOTATION_GROUP_TYPE, ANNOTATION_TYPE, parse } from '@sap-ux/cds-annotation-parser';
import { convertAnnotation } from './annotation';
import type { Annotation, AnnotationGroup, Assignment, Identifier } from '@sap-ux/cds-annotation-parser';
import type { CdsVocabulary, VocabularyService } from '@sap-ux/odata-vocabularies';

import type {
    AnnotationAssignmentToken,
    FileIndex,
    IdentifierToken,
    MetadataCollector,
    CdsCompilerFacade,
    PropagatedTargetMap
} from '@sap/ux-cds-compiler-facade';

import type { ToTermsOptions } from './types';

import {
    getElementAttribute,
    getElementAttributeValue,
    REFERENCE_TYPE,
    TARGET_TYPE,
    Edm,
    ELEMENT_TYPE,
    positionContained,
    isBefore,
    elementsWithName,
    getSingleTextNode
} from '@sap-ux/odata-annotation-core';
import type {
    Namespace,
    AnnotationFile,
    PositionPointer,
    Element,
    Diagnostic,
    Reference
} from '@sap-ux/odata-annotation-core';
import type { Target as TargetType } from '@sap-ux/odata-annotation-core-types';
import type { MetadataElementWithParentKey } from '@sap/ux-cds-compiler-facade/dist/metadata';

export { TARGET_TYPE } from '@sap-ux/odata-annotation-core-types';

const SERVICE_NAME_PLACEHOLDER = '<ServiceName>';

/**
 * Adapts the segments of an array of Identifiers based on a new name.
 *
 * @param segments - The array of Identifier segments to adapt.
 * @param newName - The new name to use for adaptation.
 * If undefined, the segments will be cleared.
 */
function adaptSegments(segments: Identifier[], newName: string | undefined): void {
    const newSegments = newName ? newName.split('.') : [];
    newSegments.forEach((internalSegment, index) => {
        if (segments[index]) {
            segments[index].value = internalSegment;
        }
    });
    // TODO adapt ranges ?
    if (newSegments.length > segments.length) {
        newSegments.slice(segments.length).forEach((newSegment) => {
            segments.push({ type: 'identifier', value: newSegment });
        });
    } else if (newSegments.length < segments.length) {
        segments.splice(newSegments.length, segments.length - newSegments.length);
    }
}
export const adjustCdsTermNames = (assignment: Assignment, cdsVocabulary: CdsVocabulary): Assignment => {
    if (assignment?.type === ANNOTATION_TYPE) {
        if (cdsVocabulary.nameMap.has(assignment.term.value)) {
            const internalTermName = cdsVocabulary.nameMap.get(assignment.term.value);
            assignment.term.value = internalTermName ?? '';
            adaptSegments(assignment.term.segments, internalTermName);
        } else if (
            assignment.term.segments.length > 2 &&
            cdsVocabulary.groupNames.has(assignment.term.segments[0].value)
        ) {
            // value help e.g. for @cds.persistence.ex| - avoid flattening logic later on by replacing this with truncated CDS term
            // (use name convention for building internal cds term names i.e. cds.persistence.exists => CDS.CdsPersistenceExists)
            const adaptedSegments = assignment.term.segments.map(
                (segment) => segment.value.slice(0, 1).toUpperCase() + segment.value.slice(1)
            );
            const internalTermName = cdsVocabulary.alias + '.' + adaptedSegments.join('');
            assignment.term.value = internalTermName;
            adaptSegments(assignment.term.segments, internalTermName);
        }
    } else if (assignment?.type === ANNOTATION_GROUP_TYPE && cdsVocabulary.groupNames.has(assignment.name.value)) {
        // only CDS annotations ? set group name to CDS vocabulary alias and goup item name to internal term name
        const nonCdsItems = (assignment?.items?.items || []).filter(
            (groupItem) => !cdsVocabulary.nameMap.has(assignment.name.value + '.' + groupItem.term.value)
        );
        if (nonCdsItems.length === 0 && cdsVocabulary.nameMap) {
            (assignment?.items?.items || []).forEach((groupItem) => {
                const internalTermName = getInternalTermName(cdsVocabulary, groupItem, assignment);
                groupItem.term.value = internalTermName ?? '';
                adaptSegments(groupItem.term.segments, internalTermName);
            });
            assignment.name.value = cdsVocabulary.alias;
        }
    }
    return assignment;
};

/**
 * Get the internal term name from the CDS vocabulary and group item.
 *
 * @param cdsVocabulary - The CDS vocabulary containing nameMap and alias.
 * @param groupItem - The group item annotation.
 * @param assignment - assignment name value
 * @returns The internal term name, or undefined if not found.
 */
function getInternalTermName(
    cdsVocabulary: CdsVocabulary,
    groupItem: Annotation | undefined,
    assignment: AnnotationGroup
) {
    if (cdsVocabulary?.nameMap && groupItem) {
        const assignmentName = assignment.name.value;
        const termValue = groupItem.term.value;

        const fullName = assignmentName + '.' + termValue;

        const fullNameFromMap = cdsVocabulary.nameMap.get(fullName);

        if (fullNameFromMap) {
            return fullNameFromMap.slice(cdsVocabulary.alias.length + 1);
        }
    }

    return undefined;
}

export const toAssignment = (
    annotation: AnnotationAssignmentToken,
    vocabularyService: VocabularyService
): Assignment => {
    // Work around solution: CDS returns annotation text along with entity type property
    let text = annotation.text;
    if (
        annotation.range &&
        annotation.carrier?.range &&
        positionContained(annotation.range, annotation.carrier.range.start)
    ) {
        text = annotation.text.substring(
            0,
            annotation.text.length - (annotation.carrier.range.end.character - annotation.carrier.range.start.character)
        );
    }
    // end of work around solution
    const assignment = parse(text, Position.create(annotation.line, annotation.character));
    adjustCdsTermNames(assignment as Assignment, vocabularyService.cdsVocabulary);
    return assignment as Assignment;
};

export interface Target {
    type: typeof TARGET_TYPE;
    name: string; // cds path name i.e. 'AdminService.SafetyIncidents.ID'
    kind: string; // cds kind i.e. 'element'
    nameRange?: Range;
    range?: Range;
    assignments: Assignment[];
}

interface ReturnValue {
    file: AnnotationFile;
    pointer?: PositionPointer;
    nodeRange?: Range;
    diagnostics?: Diagnostic[];
}

export const toTarget = (
    carrier: IdentifierToken | undefined,
    carrierName: string,
    compilerFacade?: CdsCompilerFacade
): Target => {
    const kind = Array.isArray(carrier?.definitions)
        ? carrier?.definitions[0].kind
        : carrier?.definitions?.kind || 'entity';
    if (['entity', 'view'].includes(kind)) {
        carrierName = compilerFacade?.convertNameToEdmx(carrierName) ?? carrierName;
    }
    return { type: TARGET_TYPE, name: carrierName, nameRange: carrier?.range, assignments: [], kind };
};

export interface CdsAnnotationFile {
    namespace?: Namespace;
    references: Reference[];
    targetMap: Map<string, Target>;
}

export const toTargetMap = (
    fileIndex: FileIndex,
    uri: string,
    vocabularyService: VocabularyService,
    cdsCompilerFacade?: CdsCompilerFacade
): CdsAnnotationFile => {
    const targetMap = prepareTargetMap(fileIndex, vocabularyService, cdsCompilerFacade);
    targetMap.forEach((value) => {
        // Ensure value.range is defined before using it
        if (value.range) {
            // Adjust target range
            const { start, end } = value.assignments.reduce((range, assignment) => {
                if (assignment.range && isBefore(assignment.range.start, range.start)) {
                    range.start = copyPosition(assignment.range.start);
                }
                if (assignment.range && isBefore(range.end, assignment.range.end)) {
                    range.end = copyPosition(assignment.range.end);
                }
                return range;
            }, copyRange(value.range));
            value.range = Range.create(start, end);
        }
    });
    let references: Reference[] = [];
    let namespace;
    const namespaces = cdsCompilerFacade?.getNamespaceAndReference(uri);
    if (namespaces) {
        namespace = namespaces.namespace;
        references = namespaces.references;
    }
    return { targetMap, references, namespace };
};

export const toAnnotationFile = (
    fileUri: string,
    vocabularyService: VocabularyService,
    cdsAnnotationFile: CdsAnnotationFile,
    metadataCollector: MetadataCollector,
    position?: Position,
    propagationMap?: PropagatedTargetMap
): { file: AnnotationFile; pointer?: PositionPointer; nodeRange?: Range; diagnostics?: Diagnostic[] } => {
    const supportedVocabularies = [...vocabularyService.getVocabularies().values()];
    const returnValue: ReturnValue = {
        file: {
            type: 'annotation-file',
            uri: fileUri,
            namespace: cdsAnnotationFile.namespace,
            targets: [],
            contentRange: Range.create(0, 0, 0, 0),
            range: Range.create(0, 0, 0, 0),
            references: [
                ...cdsAnnotationFile.references,
                ...supportedVocabularies.map(
                    (vocabulary): Reference => ({
                        type: REFERENCE_TYPE,
                        name: vocabulary.namespace,
                        alias: vocabulary.defaultAlias
                    })
                )
            ]
        }
    };
    let diagnostics: Diagnostic[] = [];
    returnValue.file.targets = [...cdsAnnotationFile.targetMap].map(([, value], targetIndex) => {
        const { terms, mdPathSet, diag } = convertTargetAnnotations(
            value,
            vocabularyService,
            returnValue,
            targetIndex,
            position
        );
        addMdPathsFromAnnotations(terms, mdPathSet);
        diagnostics = diagnostics.concat(diag);
        if (position && !returnValue.pointer && positionContained(value.range, position)) {
            returnValue.pointer = ['', 'targets', targetIndex].join('/');
            returnValue.nodeRange = value.range;
        }
        const { edmxPath, collectorKey } = metadataCollector.facade
            ? metadataCollector.facade.collectMetadataForAbsolutePath(value.name, value.kind, metadataCollector)
            : { edmxPath: value.name, collectorKey: '' };
        collectRelativePaths(edmxPath, collectorKey, mdPathSet, metadataCollector);
        if (value.range) {
            setFileRange(returnValue, value.range);
            setContentRange(returnValue, value.range);
        }
        return {
            type: TARGET_TYPE,
            name: edmxPath,
            nameRange: value.nameRange ?? undefined,
            range: value.range,
            termsRange: value.range,
            terms
        };
    });
    returnValue.diagnostics = diagnostics;
    checkGhostTarget(returnValue, propagationMap);

    return returnValue;
};

/**
 * Sets the end position of the file range in the return value.
 *
 * @param returnValue - The return value object.
 * @param range - The range to copy the end position from.
 */
function setFileRange(returnValue: ReturnValue, range: Range) {
    if (returnValue.file.range) {
        returnValue.file.range.end = copyPosition(range.end);
    }
}

/**
 * Sets the end position of the content range in the return value.
 *
 * @param returnValue - The return value object.
 * @param range - The range to copy the end position from.
 */
function setContentRange(returnValue: ReturnValue, range: Range) {
    if (returnValue.file.contentRange) {
        returnValue.file.contentRange.end = copyPosition(range.end);
    }
}

/**
 * Converts target annotations from a Target node into Element nodes.
 *
 * @param value - The Target node containing annotations.
 * @param vocabularyService - The vocabulary service for term resolution.
 * @param returnValue - The ReturnValue object to store additional information.
 * @param targetIndex - The index of the target within the context.
 * @param [position] - The optional position within the document for diagnostics.
 * @returns Returns an object containing the converted terms, metadata path set, and diagnostics.
 * @property {Element[]} terms - The array of converted Element nodes representing the terms.
 * @property {Set<string>} mdPathSet - The set of metadata paths extracted from the converted terms.
 * @property {Diagnostic[]} diag - The array of diagnostics generated during conversion.
 */
function convertTargetAnnotations(
    value: Target,
    vocabularyService: VocabularyService,
    returnValue: ReturnValue,
    targetIndex: number,
    position?: Position
): {
    terms: Element[];
    mdPathSet: Set<string>;
    diag: Diagnostic[];
} {
    let diag: Diagnostic[] = [];
    const mdPathSet: Set<string> = new Set();
    const terms = value.assignments.reduce((acc, assignment): Element[] => {
        const options: ToTermsOptions = {
            vocabularyService
        };
        if (position && assignment.range && positionContained(assignment.range, position)) {
            options.position = position;
        }
        const { nodeRange, terms, pointer, pathSet, diagnostics } = convertAnnotation(assignment, options);

        if (diagnostics?.length > 0) {
            diag = diag.concat(diagnostics);
        }
        if (options.position) {
            // TODO: clean this up
            if (pointer) {
                const [innerIndex, ...rest] = pointer.split('/').slice(1);
                const adjustedTermIndex = acc.length + parseInt(innerIndex, 10);
                returnValue.pointer = ['', 'targets', targetIndex, 'terms', adjustedTermIndex, ...rest].join('/');
                // if there is no pointer, then node range is meaningless
                returnValue.nodeRange = nodeRange;
            } else if (assignment.type === ANNOTATION_GROUP_TYPE) {
                returnValue.pointer = ['', 'targets', targetIndex].join('/');
                // if there is no pointer, then node range is meaningless
                returnValue.nodeRange = assignment.items.range;
            }
        }
        (pathSet ?? new Set()).forEach((path) => {
            let mdPath = path.split('@')[0];
            if (mdPath.endsWith('/')) {
                mdPath = mdPath.slice(0, -1);
            }
            if (mdPath) {
                mdPathSet.add(mdPath);
            }
        });
        return [...acc, ...terms];
    }, [] as Element[]);

    return { terms, mdPathSet, diag };
}

/**
 *
 * @param returnValue - The return value containing file targets.
 * @param [propagationMap] - The map of propagated targets.
 */
function checkGhostTarget(returnValue: ReturnValue, propagationMap?: PropagatedTargetMap): void {
    if (propagationMap) {
        const sourceTargets = returnValue.file.targets;
        const ghostTargets: TargetType[] = [];
        sourceTargets.forEach((target) => {
            if (propagationMap[target.name]) {
                Object.keys(propagationMap[target.name]).forEach((propagatedTargetName) => {
                    const ghostTarget = { ...target };
                    ghostTarget.name = propagatedTargetName;
                    ghostTargets.push(ghostTarget);
                });
            }
        });

        returnValue.file.targets = ghostTargets;
    }
}

/**
 *
 * @param valueListParameterRecordElement record element inside value list information.
 * @returns value list property path or undefined.
 */
function getValueListPropertyPathValue(valueListParameterRecordElement: Element): string | undefined {
    let pathValue;
    const prop = getRecordPropertyElement(valueListParameterRecordElement, 'ValueListProperty');
    if (prop) {
        const valueAttr = getElementAttribute(prop, Edm.String);
        if (valueAttr) {
            pathValue = valueAttr.value;
        } else {
            const pathNodes = elementsWithName(Edm.String, prop);
            if (pathNodes.length) {
                pathValue = getSingleTextNode(pathNodes[0])?.text;
            }
        }
    }
    return pathValue;
}

const getRecordPropertyElement = (recordElement: Element, propertyName: string): Element | undefined => {
    return (recordElement?.content ?? []).find(
        (child) =>
            child.type === ELEMENT_TYPE &&
            child.name === Edm.PropertyValue &&
            getElementAttributeValue(child, Edm.Property) === propertyName
    ) as Element;
};

/**
 *
 * @param valueListRecordElement record element inside value list information.
 * @returns value of value list CollectionPath
 */
function getValueListCollectionPathValue(valueListRecordElement: Element): string | undefined {
    let collectionPath;
    const collectionPathProperty = getRecordPropertyElement(valueListRecordElement, 'CollectionPath');
    if (collectionPathProperty) {
        const valueAttr = getElementAttribute(collectionPathProperty, Edm.String);
        if (valueAttr) {
            collectionPath = valueAttr.value;
        } else {
            const stringNodes = elementsWithName(Edm.String, collectionPathProperty);
            if (stringNodes.length) {
                collectionPath = getSingleTextNode(stringNodes[0])?.text;
            }
        }
    }
    return collectionPath;
}

/**
 *
 * @param term valueList term element
 * @returns value list properties e.g collection path, parameters.
 */
function extractValueListPropertiesFromAnnotation(term: Element): { collectionPath: string; parameters: string[] } {
    const result: { collectionPath: string; parameters: string[] } = { collectionPath: '', parameters: [] };
    try {
        const mainRecord = elementsWithName(Edm.Record, term)[0];
        if (mainRecord) {
            const collectionPath = getValueListCollectionPathValue(mainRecord);
            if (collectionPath) {
                result.collectionPath = collectionPath;
            }
            const params = getRecordPropertyElement(mainRecord, 'Parameters');
            if (params) {
                const collection = elementsWithName(Edm.Collection, params)[0];
                if (collection) {
                    result.parameters.push(...collectAllValueListProperty(collection));
                }
            }
        }
    } catch (e) {
        // nothing to do
    }
    return result;
}

/**
 *
 * @param collection collection inside valueList Term
 * @returns list of all value list properties in string array.
 */
function collectAllValueListProperty(collection: Element): string[] {
    const parameters: string[] = [];
    elementsWithName(Edm.Record, collection).forEach((rec) => {
        const recType = getElementAttributeValue(rec, Edm.Type) ?? '';
        if (recType) {
            const valueListProperty = getValueListPropertyPathValue(rec);
            if (recType.indexOf('ValueListParameter') >= 0) {
                if (valueListProperty) {
                    parameters.push(valueListProperty);
                }
            }
        }
    });
    return parameters;
}

/**
 *
 * @param terms - An array of elements representing terms with annotations.
 * @param mdPathSet - The set to which metadata paths are added.
 */
function addMdPathsFromAnnotations(terms: Element[], mdPathSet: Set<string>): void {
    terms
        .filter((t: Element) =>
            ['Common.ValueList', 'com.sap.vocabularies.Common.v1.ValueList'].includes(
                getElementAttributeValue(t, Edm.Term)
            )
        )
        .forEach((term) => {
            const valueListData = extractValueListPropertiesFromAnnotation(term);
            if (valueListData.collectionPath) {
                mdPathSet.add(`${SERVICE_NAME_PLACEHOLDER}/${valueListData.collectionPath}`);
                valueListData.parameters.forEach((p) => {
                    if (p) {
                        mdPathSet.add(`${SERVICE_NAME_PLACEHOLDER}/${valueListData.collectionPath}/${p}`);
                    }
                });
            }
        });
}

/**
 * Prepares a map of targets based on annotation assignments.
 *
 * @param fileIndex - The file index containing annotation assignments.
 * @param vocabularyService - The vocabulary service for resolving types.
 * @param [compilerFacade] - Optional compiler facade for additional functionality.
 * @returns A map where the keys are stringified annotation ranges,
 *          and the values are targets with associated assignments.
 */
function prepareTargetMap(
    fileIndex: FileIndex,
    vocabularyService: VocabularyService,
    compilerFacade?: CdsCompilerFacade
): Map<string, Target> {
    const targetMap = new Map<string, Target>();
    for (const annotation of fileIndex.annotationAssignments) {
        const assignment = toAssignment(annotation, vocabularyService);
        updateTargetMap(annotation, compilerFacade, assignment, targetMap);
    }
    return targetMap;
}

/**
 * Update the target map based on the given annotation and assignment.
 *
 * @param annotation - The annotation containing the carrier information.
 * @param compilerFacade - The CDS compiler facade.
 * @param assignment - The assignment associated with the annotation.
 * @param targetMap - The target map to update.
 */
function updateTargetMap(
    annotation: AnnotationAssignmentToken,
    compilerFacade: CdsCompilerFacade | undefined,
    assignment: Assignment,
    targetMap: Map<string, Target>
): void {
    if (annotation.carrier) {
        const { range } = annotation.carrier;
        const id = JSON.stringify(range);
        if (targetMap.has(id)) {
            const target = targetMap.get(id);
            if (assignment && target) {
                target.assignments.push(assignment);
            }
        } else {
            const target = toTarget(annotation.carrier, annotation.carrierName, compilerFacade);
            if (assignment) {
                target.range = assignment.range;
                target.assignments.push(assignment);
            } else {
                target.range = copyRange(annotation.range);
            }
            targetMap.set(id, target);
        }
    }
}

/**
 * Collects metadata for relative paths used in annotation values based on the provided parameters.
 *
 * @param targetPath - The target path for which relative paths are collected.
 * @param targetCollectorKey - The key used for metadata collection related to the target.
 * @param mdPathSet - The set of metadata paths extracted from annotation values.
 * @param metadataCollector - The MetadataCollector for collecting metadata.
 */
function collectRelativePaths(
    targetPath: string,
    targetCollectorKey: string,
    mdPathSet: Set<string>,
    metadataCollector: MetadataCollector
) {
    if (targetCollectorKey && mdPathSet.size > 0 && metadataCollector?.facade) {
        const targetBase = targetPath.split('/')[0].split('(')[0];
        const segments = targetBase.split('.');
        let serviceName = segments.slice(0, segments.length - 1).join('.');
        if (metadataCollector?.facade.getServiceKind(serviceName) !== 'service') {
            serviceName = '';
        }
        // collect metadata for relative paths used in annotation values
        // find base path for relative paths
        let baseKey = targetCollectorKey;
        let baseEntry = metadataCollector.metadataElementMap.get(baseKey);
        const pathBaseKinds = ['entity', 'view', 'action', 'function', 'aspect'];
        let nodeKind = getNodeKind(baseEntry, metadataCollector);
        // go up until parent has allowed pathBaseKind (e.g. needed for annotations targeting nested complex types)
        while (baseEntry?.parentKey && !!nodeKind && !pathBaseKinds?.includes(nodeKind)) {
            baseKey = baseEntry.parentKey;
            baseEntry = metadataCollector.metadataElementMap.get(baseKey);
            nodeKind = getNodeKind(baseEntry, metadataCollector);
        }
        // go further up until parent has no allowed pathBaseKind anymore (example ?)
        while (baseEntry?.parentKey && !!nodeKind && pathBaseKinds?.includes(nodeKind)) {
            baseKey = baseEntry.parentKey;
            baseEntry = metadataCollector.metadataElementMap.get(baseKey);
            nodeKind = getNodeKind(baseEntry, metadataCollector);
        }
        for (const relativePath of [...mdPathSet]) {
            metadataCollector?.facade?.collectMetadataForRelativePath(
                relativePath,
                baseKey,
                serviceName,
                metadataCollector
            );
        }
    }
}

/**
 * Get the kind of the parent node associated with a given base entry.
 *
 * @param baseEntry - The base entry for which to retrieve the parent node's kind.
 * @param metadataCollector - The metadata collector containing the metadata element map.
 * @returns The kind of the parent node, or undefined if not found.
 */
function getNodeKind(
    baseEntry: MetadataElementWithParentKey | undefined,
    metadataCollector: MetadataCollector
): string | undefined {
    return baseEntry?.parentKey
        ? metadataCollector?.metadataElementMap?.get(baseEntry.parentKey)?.node?.kind
        : undefined;
}
