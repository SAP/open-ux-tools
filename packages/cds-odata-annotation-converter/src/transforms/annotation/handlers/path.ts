import type { Path, Identifier, Separator } from '@sap-ux/cds-annotation-parser';
import {
    PATH_TYPE,
    nodeRange,
    copyRange,
    copyPosition,
    IDENTIFIER_TYPE,
    SEPARATOR_TYPE
} from '@sap-ux/cds-annotation-parser';

import type { Element, ODataPathSeparatorDiagnostic } from '@sap-ux/odata-annotation-core-types';
import {
    createElementNode,
    createTextNode,
    Range,
    Edm,
    Diagnostic,
    DiagnosticSeverity,
    ODATA_PATH_SEPARATOR_RULE
} from '@sap-ux/odata-annotation-core-types';

import { i18n } from '../../../i18n';

import type { NodeHandler } from '../handler';
import type { VisitorState } from '../visitor-state';

import { pathLikeTypeElementName } from '../path-utils';

export const pathHandler: NodeHandler<Path> = {
    type: PATH_TYPE,
    convert(state: VisitorState, node: Path): Element | undefined {
        const elementName =
            (state.context.valueType ? pathLikeTypeElementName(state.context.valueType) : undefined) ?? Edm.Path;

        const pathText = node.value
            .split('@')
            .map((segment, i) => (i === 0 ? segment.replace(/\./g, '/') : segment))
            .join('@');

        const fragmentRanges = calculateFragmentRanges(state, node);

        state.addPath(pathText);

        const element: Element = createElementNode({
            name: elementName,
            range: nodeRange(node, true),
            contentRange: nodeRange(node, false),
            content: [createTextNode(pathText, nodeRange(node, false), fragmentRanges)]
        });
        return element;
    }
};

interface Fragment {
    image: string;
    range: Range;
}
/**
 * Fragment ranges are calculated as following.
 * before first @ all '.' chars have been replaced by '/', hence every segment considered as fragment.
 * after first @ fragments are parts separated by '/', i.e. dots are not separators of fragments in that region.
 *
 * @param state - The visitor state.
 * @param node - The path node containing segments and separators.
 * @returns An array of fragment ranges derived from the positions of segments and separators.
 */
function calculateFragmentRanges(state: VisitorState, node: Path): Range[] {
    const tokens = [...node.segments, ...node.separators].sort((a, b) => {
        const startA = a.range?.start?.character;
        const startB = b.range?.start?.character;
        if (startA && startB && startA !== startB) {
            return startA - startB;
        }
        const endA = a.range?.end?.character;
        const endB = b.range?.end?.character;
        if (endA && endB) {
            return endA - endB;
        }
        return 0;
    });

    const fragments = convertToFragments(state, node, tokens);

    return fragments.map((fragment): Range => fragment.range);
}

/**
 * Converts the segments of a Path node into Fragments, handling both data model segments and annotation references.
 *
 * @param state - The VisitorState object managing the state during the visit.
 * @param node - The Path node representing the path.
 * @param tokens - The array of Identifier or Separator tokens representing the path segments.
 * @returns An array of Fragments representing the converted segments of the path.
 */
function convertToFragments(state: VisitorState, node: Path, tokens: (Identifier | Separator)[]): Fragment[] {
    // If any of the token range is not defined,
    // then we can't generate fragment ranges correctly => no ranges are returned
    const fragments: Fragment[] = [];
    let i = 0;

    // Process data model segments (until first annotation reference starting with @)
    for (; i < tokens.length; i++) {
        const token = tokens[i];
        if (token.type === IDENTIFIER_TYPE) {
            if (token.value.includes('@')) {
                // segment referencing annotation is found
                break;
            }
            if (!token.range) {
                return [];
            }

            const fragment: Fragment = {
                image: token.value,
                range: copyRange(token.range)
            };
            fragments.push(fragment);
        } else if (token.value === '/' && !token.escaped) {
            pushWrongPathSeparatorDiagnostic(state, token);
        }
    }

    const annotationFragments = processAnnotationSegments(state, node, tokens, i);
    // TODO: check if we should actually include fragments with 0 length
    // filtering fragments with no content to preserve existing behavior
    return [...fragments, ...annotationFragments].filter((fragment) => fragment.image.length);
}

/**
 * Processes the segments of an annotation path, extracting fragments and checking for missing path escaping.
 *
 * @param state - The VisitorState object managing the state during the visit.
 * @param node - The Path node representing the path.
 * @param tokens - The array of Identifier or Separator tokens representing the path segments.
 * @param startIndex - The index indicating the start of the range in the tokens array.
 * @returns An array of Fragments representing the processed segments of the annotation path.
 */
function processAnnotationSegments(
    state: VisitorState,
    node: Path,
    tokens: (Identifier | Separator)[],
    startIndex: number
): Fragment[] {
    const fragments: Fragment[] = [];
    let requiresEscaping = false;
    let i = startIndex;
    while (i < tokens.length) {
        let token = tokens[i];

        if (!token.range) {
            return [];
        }

        const fragment: Fragment = {
            image: '',
            range: Range.create(copyPosition(token.range.start), copyPosition(token.range.start))
        };

        while (token?.type === IDENTIFIER_TYPE || token?.value === '.') {
            fragment.image += token.value;

            if (fragment.range && token.range) {
                fragment.range.end = copyPosition(token.range.end);
            }

            i++;
            token = tokens[i];

            if (token?.type === SEPARATOR_TYPE && token.value === '/' && !token.escaped) {
                requiresEscaping = true;
            }
        }

        fragments.push(fragment);
        i++;
    }

    if (requiresEscaping) {
        pushMissingPathEscapingDiagnostic(state, node, tokens, startIndex);
    }

    return fragments;
}

/**
 * Pushes a diagnostic for missing path escaping brackets in the specified range of tokens.
 *
 * @param state - The VisitorState object managing the state during the visit.
 * @param node - The Path node representing the path.
 * @param tokens - The array of Identifier or Separator tokens representing the path segments.
 * @param startIndex - The index indicating the start of the range in the tokens array.
 */
function pushMissingPathEscapingDiagnostic(
    state: VisitorState,
    node: Path,
    tokens: (Identifier | Separator)[],
    startIndex: number
): void {
    const start = tokens[startIndex];
    const end = tokens.slice(-1)[0];
    if (!start?.range || !end?.range) {
        return;
    }

    const pathSeparatorDiagnostic: ODataPathSeparatorDiagnostic = {
        rule: ODATA_PATH_SEPARATOR_RULE,
        message: i18n.t('Path_escaping_brackets_should_be_used'),
        range: Range.create(copyPosition(start.range.start), copyPosition(end.range.end)),
        severity: DiagnosticSeverity.Warning
    };

    const valueToBeEscaped = '@' + node.value.split('@').slice(1).join('@');

    const prefix = start.type === IDENTIFIER_TYPE && start.quoted ? '' : '![';
    const suffix = ']';
    // If there are existing escape sequences, we need to remove them
    const body = valueToBeEscaped.replace(/[![\]]/g, '');

    pathSeparatorDiagnostic.data = {
        value: valueToBeEscaped,
        proposedValue: prefix + body + suffix
    };

    state.addDiagnostic(pathSeparatorDiagnostic);
}

/**
 * Pushes a diagnostic for a wrong path separator in the given token range.
 *
 * @param state - The VisitorState object managing the state during the visit.
 * @param token - The Separator token representing the path separator.
 */
function pushWrongPathSeparatorDiagnostic(state: VisitorState, token: Separator): void {
    if (!token.range) {
        return;
    }
    // code action to correct wrong separator
    const message = i18n.t('Wrong_path_separator_0_Did_you_mean_1', {
        currentValue: '/',
        proposedValue: '.',
        interpolation: { escapeValue: false }
    });

    const diagnostic = Diagnostic.create(token.range, message, DiagnosticSeverity.Warning);
    diagnostic.data = {
        caseCheck: {
            value: '/',
            proposedValue: '.',
            lookupPath: [],
            isNamespacedValue: false
        }
    };
    state.addDiagnostic(diagnostic);
}
