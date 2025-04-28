import { toFullyQualifiedName } from '..';

import type { ParsedPath, ParsedPathSegment } from './parse';
import { PATH_SEPARATOR } from './parse';

/**
 * Converts path to fully qualified representation.
 *
 * @param namespaceMap namespace map
 * @param currentNamespace namespace
 * @param path path
 * @returns fully qualified path string
 */
export function toFullyQualifiedPath(
    namespaceMap: { [aliasOrNamespace: string]: string },
    currentNamespace: string,
    path: ParsedPath
): string {
    return path.segments
        .map((segment) => toFullyQualifiedPathSegment(namespaceMap, currentNamespace, segment))
        .join(PATH_SEPARATOR);
}

/**
 * Converts path segment to fully qualified representation.
 *
 * @param namespaceMap namespace map
 * @param currentNamespace namespace
 * @param segment segment
 * @returns fully qualified segment text
 */
function toFullyQualifiedPathSegment(
    namespaceMap: { [aliasOrNamespace: string]: string },
    currentNamespace: string,
    segment: ParsedPathSegment
): string {
    const namespace = segment.namespaceOrAlias ? namespaceMap[segment.namespaceOrAlias] : currentNamespace;

    switch (segment.type) {
        case 'action-function': {
            const parameters = segment.parameters
                .map((parameter) => toFullyQualifiedName(namespaceMap, currentNamespace, parameter))
                .filter((parameter): parameter is string => !!parameter)
                .join(',');

            return `${namespace ?? segment.namespaceOrAlias}.${segment.name}(${parameters})`;
        }
        case 'identifier':
            if (segment.namespaceOrAlias === undefined) {
                return segment.name;
            }
            return `${namespace ?? segment.namespaceOrAlias}.${segment.name}`;
        case 'term-cast':
            return `@${toFullyQualifiedName(namespaceMap, currentNamespace, { ...segment, type: 'identifier' }) ?? ''}${
                segment.qualifier ? '#' + segment.qualifier : ''
            }`;
        case 'navigation-property-annotation':
            return `${
                toFullyQualifiedName(namespaceMap, currentNamespace, {
                    type: 'identifier',
                    name: segment.name,
                    namespaceOrAlias: segment.namespaceOrAlias
                }) ?? ''
            }@${toFullyQualifiedName(namespaceMap, currentNamespace, { ...segment.term, type: 'identifier' }) ?? ''}${
                segment.term.qualifier ? '#' + segment.term.qualifier : ''
            }`;
        default:
            return '';
    }
}
