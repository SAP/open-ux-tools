import type { ParsedActionFunctionSignature, ParsedIdentifier } from '..';
import { parseIdentifier } from '..';

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
 * Parses OData model paths.
 *
 * @param path OData model path.
 * @returns Parsed path.
 */
export function parsePath(path: string): ParsedPath {
    const segments = path
        .split(PATH_SEPARATOR)
        .map((segment): ParsedPathSegment | undefined => {
            const termCastStartIndex = segment.indexOf('@');
            if (termCastStartIndex === 0) {
                const [term, qualifier] = segment.slice(1).split('#');
                const termCastIdentifier = parseIdentifier(term);
                return {
                    ...termCastIdentifier,
                    type: 'term-cast',
                    qualifier
                };
            } else if (termCastStartIndex > 0) {
                const [name, termCast] = segment.split('@');
                const termCastIdentifier = parseIdentifier(name);
                const [term, qualifier] = termCast.split('#');

                return {
                    ...termCastIdentifier,
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
