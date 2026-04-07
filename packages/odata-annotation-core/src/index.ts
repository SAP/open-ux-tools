export type { ParsedName, ParsedActionFunctionSignature, ParsedCollectionIdentifier, ParsedIdentifier } from './names';
export {
    parseIdentifier,
    toFullyQualifiedName,
    resolveName,
    getAliasInformation,
    getAllNamespacesAndReferences,
    toAliasQualifiedName
} from './names';

export type { NavigationPropertyAnnotationSegment, ParsedPath, ParsedPathSegment, TermCastSegment } from './paths';
export { parsePath, toFullyQualifiedPath } from './paths';

export type { FindPathResult } from './search';
export { findPathToPosition, getPositionData } from './search';

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
} from './annotation-file';

export * from './utils';

export * from '@sap-ux/odata-annotation-core-types';
