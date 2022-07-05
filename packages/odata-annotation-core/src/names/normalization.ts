import type { ParsedCollectionIdentifier, ParsedIdentifier } from './parse';

/**
 * Normalize parsed name to fully qualified name, based on the available namespaces.
 * If no matching namespaces will be found, then undefined is returned.
 *
 * @param namespaceMap Mapping from alias or namespace to namespace.
 * If namespace to namespace mappings are omitted, then converting identifiers which use namespaces will fail.
 * @param currentNamespace Namespace which will be used if the given name has not specified one.
 * @param identifier Identifier
 * @returns fully qualified name of the identifier or undefined if namespace could not be resolved.
 */
export function toFullyQualifiedName(
    namespaceMap: { [aliasOrNamespace: string]: string },
    currentNamespace: string,
    identifier: ParsedIdentifier | ParsedCollectionIdentifier
): string | undefined {
    const namespace = identifier.namespaceOrAlias ? namespaceMap[identifier.namespaceOrAlias] : currentNamespace;
    if (!namespace) {
        return undefined;
    }

    const fullyQualifiedName = `${namespace}.${identifier.name}`;

    if (identifier.type === 'collection') {
        return `Collection(${fullyQualifiedName})`;
    }

    return fullyQualifiedName;
}
