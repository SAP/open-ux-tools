import type { AliasInformation } from '@sap-ux/odata-annotation-core';
import { parsePath, toAliasQualifiedName, toFullyQualifiedPath } from '@sap-ux/odata-annotation-core';
import type {
    AnnotationListWithOrigins,
    AnnotationWithOrigin,
    CollectionExpressionWithOrigins,
    RecordWithOrigins
} from './annotations';
import type { AVTNode } from './types';

export interface NamespaceMap {
    // also add entries for namespaces to facilitate alias to namespace conversion
    [aliasOrNamespace: string]: string;
}

/**
 *  Converts path to fully qualified path.
 *
 * @param namespaceMap - Namespace or alias to namespace map.
 * @param currentNamespace - Current files namespace.
 * @param path - Path to be converted.
 * @returns Fully qualified path.
 */
export function resolvePath(namespaceMap: NamespaceMap, currentNamespace: string, path: string): string {
    const parsedPath = parsePath(path);
    return toFullyQualifiedPath(namespaceMap, currentNamespace, parsedPath);
}

/**
 * Converts enum member to fully qualified name.
 *
 * @param namespaceMap - Namespace or alias to namespace map.
 * @param currentNamespace - Current files namespace.
 * @param enumMemberString - Enum member name.
 * @returns Fully qualified enum member name.
 */
export function resolveEnumMemberValue(
    namespaceMap: NamespaceMap,
    currentNamespace: string,
    enumMemberString: string
): string {
    return enumMemberString
        .split(' ')
        .map((enumMember) => resolvePath(namespaceMap, currentNamespace, enumMember))
        .join(' ');
}

/**
 * Converts enum member name to alias qualified name.
 *
 * @param aliasInfo - Alias information.
 * @param enumMember - Enum member name
 * @returns Alias qualified enum member name.
 */
export function getAliasedEnumMember(aliasInfo: AliasInformation, enumMember: string): string {
    return enumMember
        .split(' ')
        .map((enumMember) => toAliasQualifiedName(enumMember, aliasInfo))
        .join(' ');
}

/**
 * Checks if AVT node is an annotation list.
 *
 * @param node - AVT node.
 * @returns True if node is an annotation list.
 */
export function isAnnotationList(node: AVTNode): node is AnnotationListWithOrigins {
    return typeof (node as any).target !== 'undefined';
}

/**
 * Checks if AVT node is an annotation.
 *
 * @param node - AVT node.
 * @returns True if node is an annotation.
 */
export function isAnnotation(node: AVTNode): node is AnnotationWithOrigin {
    return typeof (node as any).term !== 'undefined';
}

/**
 * Checks if AVT node is a record.
 *
 * @param node - AVT node.
 * @returns True if node is a record.
 */
export function isRecord(node: AVTNode): node is RecordWithOrigins {
    return Array.isArray((node as any).propertyValues);
}

/**
 * Checks if AVT node is a collection.
 *
 * @param node - AVT node.
 * @returns True if node is a collection.
 */
export function isCollection(node: AVTNode): node is CollectionExpressionWithOrigins {
    return (node as any).type === 'Collection';
}
