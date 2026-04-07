export type { ParsedName, ParsedActionFunctionSignature, ParsedCollectionIdentifier, ParsedIdentifier } from './parse';
export { parseIdentifier, COLLECTION_PREFIX } from './parse';
export { toFullyQualifiedName, resolveName, toAliasQualifiedName } from './normalization';

export { getAliasInformation, getAllNamespacesAndReferences } from './namespaces';
