export type {
    ParsedName,
    ParsedActionFunctionSignature,
    ParsedCollectionIdentifier,
    ParsedIdentifier
} from './parse.js';
export { parseIdentifier, COLLECTION_PREFIX } from './parse.js';
export { toFullyQualifiedName, resolveName, toAliasQualifiedName } from './normalization.js';

export { getAliasInformation, getAllNamespacesAndReferences } from './namespaces.js';
