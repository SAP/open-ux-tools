import type { AliasInformation, AliasMap, Namespace, Reference } from '@sap-ux/odata-annotation-core-types';

/**
 *  Builds alias maps for current file, include namespaces as alias names to enable unified handling
 *  also distinguish metadata and annotation references.
 *
 * @param namespaces collection of all the namespaces and references from file.
 * @param metadataNamespaces unique namespaces of metadata file.
 * @returns `alias - namespace` and `namespace- alias` map of the file.
 */
export function getAliasInformation(
    namespaces: (Namespace | Reference)[],
    metadataNamespaces: Set<string>
): AliasInformation {
    const aliasMap: AliasMap = {};
    const reverseAliasMap: AliasMap = {};
    const aliasMapMetadata: AliasMap = {};
    const aliasMapVocabulary: AliasMap = {};
    let currentFileNamespace = '';
    let currentFileAlias = '';
    namespaces.forEach((namespace) => {
        const aliasEntry: AliasMap = {};
        const reverseAliasEntry: AliasMap = {};
        if (namespace?.name) {
            aliasEntry[namespace.name] = namespace.name;
            reverseAliasEntry[namespace.name] = namespace.name;
            if (namespace.alias) {
                aliasEntry[namespace.alias] = namespace.name;
                reverseAliasEntry[namespace.name] = namespace.alias;
            }
            Object.assign(aliasMap, aliasEntry);
            Object.assign(reverseAliasMap, reverseAliasEntry);
            const forMetadata = metadataNamespaces.has(namespace.name);
            if (namespace.type === 'namespace') {
                currentFileNamespace = namespace.name;
                currentFileAlias = namespace.alias ?? '';
                if (forMetadata) {
                    Object.assign(aliasMapMetadata, aliasEntry);
                }
            } else {
                Object.assign(forMetadata ? aliasMapMetadata : aliasMapVocabulary, aliasEntry);
            }
        }
    });
    return {
        currentFileNamespace: currentFileNamespace,
        currentFileAlias: currentFileAlias,
        aliasMap: aliasMap,
        reverseAliasMap: reverseAliasMap,
        aliasMapMetadata: aliasMapMetadata,
        aliasMapVocabulary: aliasMapVocabulary
    };
}

/**
 *  Collects namespace and references and returns the collection.
 *
 * @param namespace namespace of current file.
 * @param references references of the file.
 * @returns collection of namespace and references.
 */
export function getAllNamespacesAndReferences(
    namespace: Namespace | undefined,
    references: Reference[] | undefined
): (Namespace | Reference)[] {
    const result: (Namespace | Reference)[] = [];
    if (namespace?.name) {
        result.push(namespace);
    }
    if (references?.length) {
        result.push(...references);
    }
    return result;
}
