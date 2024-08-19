export {
    ParsedName,
    ParsedActionFunctionSignature,
    ParsedCollectionIdentifier,
    ParsedIdentifier,
    parseIdentifier,
    COLLECTION_PREFIX
} from './parse';
export { toFullyQualifiedName, resolveName, toAliasQualifiedName } from './normalization';

export { getAliasInformation, getAllNamespacesAndReferences } from './namespaces';
