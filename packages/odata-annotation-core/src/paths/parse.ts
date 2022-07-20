import type { ParsedActionFunctionSignature, ParsedIdentifier } from '../names';
import { parseIdentifier } from '../names';

export interface ParsedPath {
    segments: ParsedPathSegment[];
}

export interface TermCastSegment {
    type: 'term-cast';

    namespaceOrAlias?: string;
    /**
     * Simple identifier segment of the name
     */
    name: string;
    qualifier?: string;
}

export interface NavigationPropertyAnnotationSegment {
    type: 'navigation-property-annotation';

    namespaceOrAlias?: string;
    /**
     * Simple identifier segment of the name
     */
    name: string;
    term: TermCastSegment;
}

export type ParsedPathSegment =
    | ParsedIdentifier
    | TermCastSegment
    | NavigationPropertyAnnotationSegment
    | ParsedActionFunctionSignature;

export const PATH_SEPARATOR = '/';

/**
 * Parses ODat model paths.
 * @param path OData model path.
 * @returns Parsed path.
 */
export function parsePath(path: string): ParsedPath {
    const segments = path
        .split(PATH_SEPARATOR)
        .map((segment): ParsedPathSegment | undefined => {
            const index = segment.indexOf('@');
            if (index === 0) {
                const [term, qualifier] = segment.slice(1).split('#');
                const identifier = parseIdentifier(term);
                return {
                    ...identifier,
                    type: 'term-cast',
                    qualifier
                };
            } else if (index > 0) {
                const [name, termCast] = segment.split('@');
                const identifier = parseIdentifier(name);
                const [term, qualifier] = termCast.split('#');

                return {
                    ...identifier,
                    type: 'navigation-property-annotation',
                    term: {
                        ...parseIdentifier(term),
                        type: 'term-cast',
                        qualifier
                    }
                };
            }
            const identifier = parseIdentifier(segment);

            if (identifier.type === 'identifier' || identifier.type === 'action-function') {
                return identifier;
            }
            return undefined;
        })
        .filter((segment): segment is ParsedPathSegment => !!segment);
    return {
        segments
    };
}
