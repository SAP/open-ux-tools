import { toFullyQualifiedName } from '../names';

import type { ParsedPath, ParsedPathSegment } from './parse';
import { PATH_SEPARATOR } from './parse';

/**
 *
 * @param namespaceMap
 * @param currentNamespace
 * @param path
 * @returns
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

            return `${namespace}.${segment.name}(${parameters})`;
        }
        case 'identifier':
            if (segment.namespaceOrAlias === undefined) {
                return segment.name;
            }
            return `${namespace}.${segment.name}`;
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
