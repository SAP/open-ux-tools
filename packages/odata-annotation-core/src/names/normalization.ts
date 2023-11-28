import type {
    AliasMap,
    ValueType,
    ResolvedName,
    QualifiedName,
    FullyQualifiedTypeName,
    AliasInformation
} from '@sap-ux/odata-annotation-core-types';
import type { ParsedName } from '.';
import { COLLECTION_PREFIX, parseIdentifier } from '.';

/**
 * Normalize qualified name string to fully qualified name, based on the available namespaces.
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
    identifier: ParsedName
): string | undefined {
    const namespace = identifier.namespaceOrAlias ? namespaceMap[identifier.namespaceOrAlias] : currentNamespace;

    if (!namespace) {
        return undefined;
    }

    if (identifier.type === 'action-function') {
        const parameters = identifier.parameters
            .map((parameter) => toFullyQualifiedName(namespaceMap, currentNamespace, parameter))
            .filter((parameter): parameter is string => !!parameter)
            .join(',');

        return `${namespace}.${identifier.name}(${parameters})`;
    }

    const fullyQualifiedName = `${namespace}.${identifier.name}`;

    if (identifier.type === 'collection') {
        return `Collection(${fullyQualifiedName})`;
    }

    return fullyQualifiedName;
}

/**
 * Normalize parsed name to fully qualified name, based on the available namespaces.
 * If no matching namespaces will be found, then undefined is returned.
 *
 * @param qualifiedName Identifier in <Namespace|Alias>.<Name>  format
 * @param aliasMap `alias - namespace` and `namespace- alias` map of the file.
 * @returns segmented qualifiedName based on the aliasMap used in the current file.
 */
export function resolveName(qualifiedName: QualifiedName, aliasMap?: AliasMap): ResolvedName {
    // sQualifiedName has the form "<SchemaNamespaceOrAlias>.<SimpleIdentifierOrPath>[(<FunctionOrActionSignature>)])"
    // SchemaNamespace and FunctionOrActionSignature can contain ".", SimpleIdentifierOrPath should not contain dots
    const resolvedName: ResolvedName = { name: qualifiedName, qName: qualifiedName };
    if (qualifiedName && typeof qualifiedName === 'string' && qualifiedName.indexOf('.')) {
        const indexFirstBracket = qualifiedName.indexOf('(');
        const nameBeforeBracket = indexFirstBracket > -1 ? qualifiedName.slice(0, indexFirstBracket) : qualifiedName;
        const { name, namespaceOrAlias: namespace } = parseIdentifier(nameBeforeBracket);
        resolveNonCollectionNames(qualifiedName, namespace, aliasMap, resolvedName, name);
        resolveCollectionAndFunctionNames(qualifiedName, indexFirstBracket, aliasMap, resolvedName, namespace);
    }

    return resolvedName;
}

/**
 * Get alias qualified name.
 * If no matching alias is found, then uses the parameter itself.
 *
 * @param qualifiedName Identifier in <Namespace|Alias>.<Name>  format
 * @param aliasInfo alias information
 * @returns qualified name.
 */
export function toAliasQualifiedName(qualifiedName: QualifiedName, aliasInfo: AliasInformation): string {
    const resolvedName = resolveName(qualifiedName, aliasInfo.aliasMap);
    const alias = resolvedName.namespace ? aliasInfo.reverseAliasMap[resolvedName.namespace] : undefined;
    let aliasQualifiedName = alias ? `${alias}.${resolvedName.name}` : qualifiedName;
    const indexFirstBracket = aliasQualifiedName.indexOf('(');
    if (indexFirstBracket > -1) {
        // handle signature of overloads: <SchemaNamespaceOrAlias>.<SimpleIdentifierOrPath>(<FunctionOrActionSignature>)
        const beforeBracket = aliasQualifiedName.slice(0, indexFirstBracket);
        const bracketContent = aliasQualifiedName.slice(indexFirstBracket + 1, aliasQualifiedName.lastIndexOf(')'));
        let bracketEntries = bracketContent.split(',');
        bracketEntries = bracketEntries.map((qName) => toAliasQualifiedName(qName, aliasInfo));
        aliasQualifiedName = beforeBracket + '(' + bracketEntries.join(',') + ')';
    }
    return aliasQualifiedName;
}

/**
 *
 * @param qualifiedName
 * @param namespace
 * @param aliasMap
 * @param resolvedName
 * @param name
 */
function resolveNonCollectionNames(
    qualifiedName: QualifiedName,
    namespace: string | undefined,
    aliasMap: AliasMap | undefined,
    resolvedName: ResolvedName,
    name: string
): void {
    if (!qualifiedName.startsWith(COLLECTION_PREFIX)) {
        if (namespace && aliasMap?.[namespace]) {
            // valid namespace
            if (aliasMap[namespace] && aliasMap[namespace] !== namespace) {
                resolvedName.alias = namespace;
                resolvedName.namespace = aliasMap[namespace];
            } else {
                resolvedName.namespace = namespace;
            }
            resolvedName.name = name;
            resolvedName.qName = resolvedName.namespace + '.' + name;
        } else if (!aliasMap) {
            resolvedName.name = name;
            resolvedName.namespace = namespace;
        }
    }
}

/**
 * Resolves collection or function name.
 *
 * @param qualifiedName
 * @param indexFirstBracket
 * @param aliasMap
 * @param resolvedName
 * @param namespace
 */
function resolveCollectionAndFunctionNames(
    qualifiedName: QualifiedName,
    indexFirstBracket: number,
    aliasMap: AliasMap | undefined,
    resolvedName: ResolvedName,
    namespace: string | undefined
): void {
    if (indexFirstBracket > -1) {
        const bracketContent = qualifiedName.slice(indexFirstBracket + 1, qualifiedName.lastIndexOf(')'));
        const identifier = parseIdentifier(qualifiedName);
        if (identifier.type !== 'collection') {
            resolvedName.name += '(' + bracketContent + ')';
        }

        if (namespace && aliasMap?.[namespace]) {
            if (identifier.type === 'collection') {
                const name = `${identifier.namespaceOrAlias}.${identifier.name}`;
                const valueType = convertValueTypeFromString(identifier.type, name);
                valueType.name = resolveName(valueType.name, aliasMap).qName;
                const bracketEntriesResolved = convertValueTypeToString(valueType);
                resolvedName.qName = bracketEntriesResolved;
            } else if (identifier.type === 'action-function') {
                const bracketEntriesResolved = identifier.parameters.map((param) => {
                    const name = `${param.namespaceOrAlias}.${param.name}`;
                    const valueType = convertValueTypeFromString(param.type, name);
                    valueType.name = resolveName(valueType.name, aliasMap).qName;
                    return convertValueTypeToString(valueType);
                });
                resolvedName.qName += '(' + bracketEntriesResolved.join(',') + ')';
            }
        } else if (identifier.type === 'collection') {
            const qName = resolveName(bracketContent, aliasMap).qName;
            resolvedName.qName = 'Collection(' + qName + ')';
        }
    }
}

/**
 * Converts value type object to fully qualified type name.
 *
 * @param valueType value type object
 * @returns fully qualified type name
 */
function convertValueTypeToString(valueType: ValueType): FullyQualifiedTypeName {
    return valueType?.asCollection ? 'Collection(' + valueType.name + ')' : valueType?.name || '';
}

/**
 * Converts value type string into ValueType object representation.
 *
 * @param paramType determines whether it is collection type (paramType === 'collection')
 * @param name type name
 * @returns ValueType object
 */
function convertValueTypeFromString(paramType: string, name: string): ValueType {
    const valueType: ValueType = { name, asCollection: paramType === 'collection' };
    return valueType;
}
