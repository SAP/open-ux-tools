export type {
    ParsedName,
    ParsedActionFunctionSignature,
    ParsedCollectionIdentifier,
    ParsedIdentifier
} from './names/index.js';
export {
    parseIdentifier,
    toFullyQualifiedName,
    resolveName,
    getAliasInformation,
    getAllNamespacesAndReferences,
    toAliasQualifiedName
} from './names/index.js';

export type {
    NavigationPropertyAnnotationSegment,
    ParsedPath,
    ParsedPathSegment,
    TermCastSegment
} from './paths/index.js';
export { parsePath, toFullyQualifiedPath } from './paths/index.js';

export type { FindPathResult } from './search/index.js';
export { findPathToPosition, getPositionData } from './search/index.js';

export {
    indent,
    getIndentLevel,
    positionAt,
    positionContained,
    positionContainedStrict,
    isBefore,
    rangeContained
} from '@sap-ux/text-document-utils';

export {
    elements,
    elementsWithName,
    getElementAttribute,
    getElementAttributeValue,
    getSingleTextNode,
    isElementWithName
} from './annotation-file.js';

export * from './utils/index.js';

export * from '@sap-ux/odata-annotation-core-types';
