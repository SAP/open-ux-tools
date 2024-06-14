import type { RawAnnotation, AnnotationList } from '@sap-ux/vocabularies-types';

import { Edm } from '@sap-ux/odata-annotation-core-types';
import type { AliasInformation, AnnotationFile, Element, Target } from '@sap-ux/odata-annotation-core-types';

import type { AnnotationReference } from '../types';
import { getElementAttributeValue, parsePath, resolveName, toFullyQualifiedPath } from '@sap-ux/odata-annotation-core';
import { ApiErrorCode, ApiError } from '../error';
import { annotationReferenceToString } from '../utils';
import type { NamespaceMap } from './utils';
import type { AVTNode } from './types';
import { convertPointerInAnnotationToInternal } from './pointer';

/**
 * Finds a node matching to the pointer from root.
 *
 * @param root - Root node.
 * @param pointer - Pointer to a node.
 * @returns Node matching pointer.
 */
export function getAvtNodeFromPointer(root: RawAnnotation, pointer: string): AVTNode | undefined {
    const segments = pointer.split('/');
    if (segments[0] === '') {
        segments.shift(); // Remove the first empty segment
    }
    if (segments.length === 0) {
        return undefined;
    }
    let node: AVTNode = root;
    for (const segment of segments) {
        const next: AVTNode | undefined = (node as unknown as { [key: string]: AVTNode })[segment];
        if (next) {
            node = next;
        } else {
            return undefined;
        }
    }
    return node;
}

/**
 *  Fins first annotation matching the reference.
 *
 * @param annotationLists - Annotation lists.
 * @param reference - Annotation reference.
 * @returns Matching annotation.
 */
export function findAnnotation(
    annotationLists: AnnotationList[],
    reference: AnnotationReference
): RawAnnotation | undefined {
    for (const annotationList of annotationLists) {
        if (annotationList.target === reference.target) {
            for (const annotation of annotationList.annotations) {
                if (annotation.term === reference.term && annotation.qualifier === reference.qualifier) {
                    return annotation;
                }
            }
        }
    }
    return undefined;
}

export interface SearchResult {
    element: Element;
    target: Target;
    targetPointer: string;
    internalPointer: string;
}

/**
 *
 * @param aliasInfo - Alias information.
 * @param file - Internal representation.
 * @param mergeMap - Annotation merge map.
 * @param reference - Annotation reference.
 * @param pointer - Pointer to a node.
 * @param mergeAnnotations - Flag indicating if annotations were merged.
 * @param valueType - Current value type.
 * @returns Annotation search result.
 */
export function findAnnotationByReference(
    aliasInfo: AliasInformation,
    file: AnnotationFile,
    mergeMap: Record<string, string>,
    reference: AnnotationReference,
    pointer: string,
    mergeAnnotations: boolean,
    valueType?: string
): SearchResult {
    // find generic representation of annotation (take first match for term and qualifier)
    for (let i = 0; i < file.targets.length; i++) {
        const target = file.targets[i];
        const targetName = resolvePath(aliasInfo.aliasMap, aliasInfo.currentFileNamespace, target.name);
        if (targetName !== reference.target) {
            continue;
        }
        for (let j = 0; j < target.terms.length; j++) {
            const term = target.terms[j];
            const qualifier = getElementAttributeValue(term, Edm.Qualifier);
            const termName = resolveName(getElementAttributeValue(term, Edm.Term), aliasInfo.aliasMap).qName;
            if (
                reference.term === termName &&
                ((!qualifier && !reference.qualifier) || qualifier === reference.qualifier)
            ) {
                if (mergeAnnotations) {
                    const suffix = qualifier ? '#' + qualifier : '';
                    const id = `${targetName}@${termName}${suffix}`;
                    const result = searchInMergedAnnotations(file, mergeMap, id, pointer, valueType);
                    if (result) {
                        return result;
                    }
                }
                const internalPointer = convertPointerInAnnotationToInternal(term, pointer, valueType);
                return { element: term, target, targetPointer: `/targets/${i}/terms/${j}`, internalPointer };
            }
        }
    }
    const path = annotationReferenceToString(reference);
    throw new ApiError(`Term '${path}' does not exist`, ApiErrorCode.General);
}

function searchInMergedAnnotations(
    file: AnnotationFile,
    mergeMap: Record<string, string>,
    id: string,
    pointer: string,
    valueType?: string
): SearchResult | undefined {
    const mergedSegments = pointer.split('/').filter((x) => !!x);
    const keyRoot = `${id}/0/0`;
    for (let segmentIndex = mergedSegments.length; segmentIndex > 0; segmentIndex--) {
        const key = `${keyRoot}/${mergedSegments.slice(0, segmentIndex).join('/')}`;
        const match = mergeMap[key];
        if (match) {
            const [, targetIndexSegment, termIndexSegment, ...mappedSourceSegments] = match.replace(id, '').split('/');
            const targetIndex = parseInt(targetIndexSegment, 10);
            const termIndex = parseInt(termIndexSegment, 10);
            const sourceTerm = file.targets[targetIndex].terms[termIndex];
            const internalPointer = convertPointerInAnnotationToInternal(
                sourceTerm,
                '/' + [...mappedSourceSegments, ...mergedSegments.slice(segmentIndex)].join('/'),
                valueType
            );
            return {
                element: sourceTerm,
                target: file.targets[targetIndex],
                targetPointer: `/targets/${targetIndex}/terms/${termIndex}`,
                internalPointer
            };
        }
    }
    return undefined;
}

function resolvePath(namespaceMap: NamespaceMap, currentNamespace: string, path: string): string {
    const parsedPath = parsePath(path);
    parsedPath.segments = parsedPath.segments.map((segment, i) => {
        if (segment.namespaceOrAlias === undefined && i === 0) {
            return {
                ...segment,
                namespaceOrAlias: currentNamespace
            };
        }
        return segment;
    });
    return toFullyQualifiedPath(namespaceMap, currentNamespace, parsedPath);
}
