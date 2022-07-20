export * from '@sap-ux/odata-annotation-core-types';
export {
    ParsedName,
    ParsedActionFunctionSignature,
    ParsedCollectionIdentifier,
    ParsedIdentifier,
    parseIdentifier,
    toFullyQualifiedName
} from './names';

export {
    NavigationPropertyAnnotationSegment,
    ParsedPath,
    ParsedPathSegment,
    TermCastSegment,
    parsePath,
    toFullyQualifiedPath
} from './paths';
