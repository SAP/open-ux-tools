export {
    ParsedName,
    ParsedActionFunctionSignature,
    ParsedCollectionIdentifier,
    ParsedIdentifier,
    parseIdentifier,
    toFullyQualifiedName,
    resolveName,
    getAliasInformation,
    getAllNamespacesAndReferences,
    toAliasQualifiedName
} from './names';

export {
    NavigationPropertyAnnotationSegment,
    ParsedPath,
    ParsedPathSegment,
    TermCastSegment,
    parsePath,
    toFullyQualifiedPath
} from './paths';

export { findPathToPosition, FindPathResult, getPositionData } from './search';

export * from './position';

export {
    elements,
    elementsWithName,
    getElementAttribute,
    getElementAttributeValue,
    getSingleTextNode,
    isElementWithName
} from './annotationFile';

export * from './utils';
