import type {
    AliasInformation,
    MetadataElement,
    IMetadataService,
    PathValue
} from '@sap-ux/odata-annotation-core-types';
import {
    ACTION_IMPORT_KIND,
    ACTION_KIND,
    FUNCTION_IMPORT_KIND,
    FUNCTION_KIND
} from '@sap-ux/odata-annotation-core-types';
import { resolveName } from '..';

/**
 * Gets outermost Metadata element which represents an entity type or complex type or has a structured type.
 *
 * @param metadata - metadataService instance
 * @param targetPath - segments separated by '/'; absolute (starts with /) or relative path
 * @param aliasInfo - object containing `alias - namespace` and `namespace - alias` maps of the file.
 * @returns metadata element or null
 */
export function getPathBaseMetadataElement(
    metadata: IMetadataService,
    targetPath: PathValue,
    aliasInfo?: AliasInformation // if not provided: all aliases should be replaced already in targetPath
): MetadataElement | null {
    const originalSegments = (targetPath.startsWith('/') ? targetPath.slice(1) : targetPath).split('/');
    const segments = originalSegments.map((originalSegment) => {
        return aliasInfo ? getSegmentWithoutAlias(aliasInfo, originalSegment) : originalSegment;
    });
    const currentSegments: string[] = [];
    let pathBaseMetadataElement: MetadataElement | null = null;
    let mostSpecificMetadataElement: MetadataElement | null = null;
    for (let i = 0; i < segments.length && !pathBaseMetadataElement; i++) {
        currentSegments.push(segments[i]);
        const currentPath = currentSegments.join('/');
        const currentMetadataElement = metadata.getMetadataElement(currentPath);
        if (currentMetadataElement) {
            mostSpecificMetadataElement = currentMetadataElement;
            if (
                isEntityOrComplexOrStructuredType(currentMetadataElement) ||
                isPathPointingToActionKindElement(metadata, currentPath) // actions/function/actionImport/functionImport serve as path base for themselves and their parameters
            ) {
                pathBaseMetadataElement = currentMetadataElement;
            }
        }
    }
    return pathBaseMetadataElement ?? mostSpecificMetadataElement;
}

/**
 * Checks whether the given metadata element represents entity type or complex structured type.
 *
 * @param currentMetadataElement
 * @returns boolean result
 */
function isEntityOrComplexOrStructuredType(currentMetadataElement: MetadataElement): boolean {
    return (
        !!currentMetadataElement.isEntityType ||
        !!currentMetadataElement.isComplexType ||
        !!currentMetadataElement.structuredType
    );
}

/**
 * Determines whether the given path is pointing to element of action/function type.
 *
 * @param metadata metadata
 * @param path path
 * @returns boolean result
 */
function isPathPointingToActionKindElement(metadata: IMetadataService, path: string): boolean {
    const edmxTypes = metadata.getEdmTargetKinds(path);
    const actionKinds = new Set([ACTION_KIND, FUNCTION_KIND, ACTION_IMPORT_KIND, FUNCTION_IMPORT_KIND]);
    return edmxTypes.findIndex((edmxType: string) => actionKinds.has(edmxType)) >= 0;
}

/**
 * Get segment without alias.
 *
 * @param aliasInfo  - object containing `alias - namespace` and `namespace - alias` maps of the file.
 * @param segment -  value separated by '/'
 * @returns segment text
 */
export function getSegmentWithoutAlias(aliasInfo: AliasInformation, segment: string): string {
    let segmentWithoutAlias = '';
    const indexAt = segment.indexOf('@');
    if (indexAt >= 0) {
        const term = resolveName(segment.substring(indexAt + 1), aliasInfo.aliasMap).qName;
        segmentWithoutAlias = segment.substring(0, indexAt) + '@' + term;
    } else if (segment.indexOf('.') > -1) {
        segmentWithoutAlias = resolveName(segment, aliasInfo.aliasMap).qName;
    } else {
        segmentWithoutAlias = segment;
    }

    return segmentWithoutAlias;
}
