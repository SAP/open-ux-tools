import { isBefore } from '@sap-ux/odata-annotation-core';
import type { AnnotationFile, Target } from '@sap-ux/odata-annotation-core-types';
import { Position, Range, TextEdit } from '@sap-ux/odata-annotation-core-types';
import type { VocabularyService } from '@sap-ux/odata-vocabularies';

import { PrintPattern, resolveTarget } from '@sap-ux/cds-odata-annotation-converter';
import type { Annotation } from '@sap-ux/cds-annotation-parser';

import { getTokenRange } from './utils';
import type { CompilerToken } from './cds-compiler-tokens';

interface IndexRange {
    start: number;
    end: number;
}

/**
 * Kind of what is currently already contained in deletion range
 * - used to expand range (e.g. with surrounding brackets) or merge ranges (if two are separated just by ',' or ';')
 */
export const enum DeletionRangeKind {
    UNDEFINED = 'Undefined',
    TERM_NAME = 'TermName', // term + value (without namespace), i.e. "Description: 'description'"
    TERM_FQ_NAME = 'TermFqName', // term + value (with namespace), i.e. "Core.Description: 'description'"
    ANNOTATION = 'Annotation', // annotation including @, i.e. "@Core.Description: 'description'"
    TARGET_ELEMENT = 'TargetElement', // with target element name, i.e. "price @Core.Description: 'description'"
    TARGET_ELEMENTS_LIST = 'TargetElementsList', // with target elements list, i.e. "{ price @Core.Description: 'description' }"
    TARGET_PARAMETER = 'TargetParameter', // with target parameter name, i.e. "rating @Core.IsCriticalParameter: true"
    TARGET_BOUND_ACTION = 'TargetBoundAction', // with bound target action name, i.e. "copy @Core.IsActionCritical: true"
    TARGET_ARTIFACT = 'TargetArtifact', // with target artifact name, i.e. "annotate AdminService.Books with @Core.Description: 'description'"
    TARGET_FROM_WITH = 'TargetFromWith' // deletion starts from 'with' keyword, i.e. "with @Core.Description: 'description'"
}

const cdsKeywords = [
    'ABSTRACT',
    'ACTION',
    'ANNOTATE',
    'ANNOTATION',
    'ASPECT',
    'CONTEXT',
    'DEFINE',
    'ENTITY',
    'EVENT',
    'EXTEND',
    'FUNCTION',
    'SERVICE',
    'TYPE',
    'USING',
    'VIEW'
];

const separatorForKind: {
    [kind: string]: string;
} = {
    Undefined: '',
    TermName: ',',
    TermFqName: ',',
    Annotation: '',
    TargetElement: ';',
    TargetBoundAction: ';',
    TargetParameter: ',',
    TargetArtifact: ';',
    TargetFromWith: ''
};

export interface DeletionRange {
    kind: DeletionRangeKind;
    printPattern: PrintPattern;
    termRange: IndexRange;
    tokenRange: IndexRange;
    isExpanded: boolean;
    includeTarget?: boolean;
}

interface Options {
    beforeTokenIndex: number; // index of token preceding deletion range
    afterTokenIndex: number; // index of token following deletion range
    separator: string; // separator character (i.e. ',' or ';') between content of deletion range and sibling
    vocabularyAliases: Set<string>;
    includeTarget: boolean;
}

/**
 * Converts deletion ranges to text edits.
 *
 * @param deletionRanges - Deletion ranges.
 * @param vocabularyAliases - Vocabulary aliases.
 * @param tokens - All tokens in the document.
 * @param annotationFile - Internal representation root.
 * @param includeTarget - Flag indicating if the target should also be deleted.
 * @returns Expanded text edit.
 */
export function getTextEditsForDeletionRanges(
    deletionRanges: DeletionRange[],
    vocabularyAliases: Set<string>,
    tokens: CompilerToken[],
    annotationFile: AnnotationFile,
    includeTarget: boolean
): TextEdit[] {
    let changed: boolean;
    // ranges need to be in order to be properly merged
    deletionRanges.sort((a, b) => a.termRange.start - b.termRange.start);
    do {
        expandDeletionRanges(vocabularyAliases, tokens, deletionRanges, annotationFile, includeTarget);
        changed = mergeDeletionRanges(tokens, deletionRanges);
    } while (changed);

    // build list of text edits for deletion (include neighboring sibling separators)
    const textEdits: TextEdit[] = [];
    for (const deletionRange of deletionRanges) {
        const {
            deletionRange: deletionRangeWithSeparator,
            previousSeparatorIncluded,
            siblingSeparatorFound
        } = includeSiblingSeparator(tokens, deletionRange);
        const range = getRangeFromTokenRange(
            tokens,
            deletionRangeWithSeparator.tokenRange,
            previousSeparatorIncluded,
            siblingSeparatorFound
        );
        if (range) {
            textEdits.push(TextEdit.del(range));
        }
    }

    return textEdits;
}

/**
 * Creates deletion ranges for a node.
 *
 * @param vocabularyService - Vocabulary API.
 * @param vocabularyAliases - Vocabulary aliases.
 * @param termIndex - Term index in the target.
 * @param tokens - All tokens in the document.
 * @param annotation - Annotation to be deleted.
 * @param target - Target name.
 * @returns Deletion range for the node.
 */
export function getDeletionRangeForNode(
    vocabularyService: VocabularyService,
    vocabularyAliases: Set<string>,
    termIndex: number,
    tokens: CompilerToken[],
    annotation: Annotation,
    target: string
): DeletionRange | undefined {
    if (annotation?.range) {
        const termValue = annotation.term.value;
        const nativeCdsTermName = vocabularyService.cdsVocabulary.reverseNameMap.get(termValue) ?? '';
        const tokenRange = getTokenRange(tokens, annotation.range);
        const kind = findTermKind(vocabularyAliases, tokens, tokenRange, nativeCdsTermName);

        return {
            kind,
            printPattern: resolveTarget(target).printPattern,
            termRange: { start: termIndex, end: termIndex },
            tokenRange,
            isExpanded: false
        };
    }
    return undefined;
}

function findTermKind(
    vocabularyAliases: Set<string>,
    tokens: CompilerToken[],
    tokenRange: IndexRange,
    nativeCdsTermName: string
): DeletionRangeKind {
    let deletionRangeKind: DeletionRangeKind | undefined;
    for (let i = tokenRange.start; i <= tokenRange.end && !deletionRangeKind; i++) {
        if (nativeCdsTermName && tokens[i].text === nativeCdsTermName) {
            deletionRangeKind = DeletionRangeKind.TERM_FQ_NAME; // e.g. @title
        } else if (vocabularyAliases.has(tokens[i].text) && tokens[i + 1].text === '.') {
            deletionRangeKind = DeletionRangeKind.TERM_FQ_NAME;
        } else if (/^\w+$/.test(tokens[i].text)) {
            // TODO use better regular expression for OData simple identifier
            deletionRangeKind = DeletionRangeKind.TERM_NAME;
        } else {
            deletionRangeKind = DeletionRangeKind.UNDEFINED;
        }
    }
    return deletionRangeKind ?? DeletionRangeKind.UNDEFINED;
}

function expandDeletionRanges(
    vocabularyAliases: Set<string>,
    tokens: CompilerToken[],
    deletionRanges: DeletionRange[],
    annotationFile: AnnotationFile,
    includeTarget: boolean
): void {
    deletionRanges
        .filter((deletionRange) => !deletionRange.isExpanded)
        .forEach((deletionRange) => {
            let changed;
            do {
                changed = true;
                const options: Options = {
                    separator: separatorForKind[deletionRange.kind],
                    beforeTokenIndex: deletionRange.tokenRange.start - 1,
                    afterTokenIndex: deletionRange.tokenRange.end + 1,
                    vocabularyAliases,
                    includeTarget
                };
                if (canIncludePrecedingComment(tokens, options)) {
                    // include comment before annotation (full lines, also block comments)
                    includePrecedingComment(deletionRange, options);
                } else if (canIncludeSubsequentComment(deletionRange, tokens, options)) {
                    // include comment after annotation (line comment only; in same line)
                    includeSubsequentComment(deletionRange, options);
                } else if (canIncludeSurroundingBrackets(deletionRange, tokens, options, true)) {
                    // include surrounding { }, maybe also <vocabularyAlias>:
                    includeSurroundingBrackets(deletionRange, tokens, options, true);
                } else if (canIncludeSurroundingBrackets(deletionRange, tokens, options)) {
                    // include surrounding ( )
                    includeSurroundingBrackets(deletionRange, tokens, options);
                } else if (
                    deletionRange.kind === DeletionRangeKind.TERM_FQ_NAME &&
                    tokens[options.beforeTokenIndex].text === '@'
                ) {
                    // @<fqTermNameWithValue> : include prefix @
                    deletionRange.tokenRange.start = options.beforeTokenIndex;
                    deletionRange.kind = DeletionRangeKind.ANNOTATION;
                } else if (canIncludeSimpleTargetName(deletionRange, tokens, options)) {
                    // <element|boundAction|param> <annotation> : include name before annotation
                    changed = includeSimpleTargetName(deletionRange, tokens, options);
                } else if (canIncludeSimpleTargetName(deletionRange, tokens, options, true)) {
                    // <annotation> <element|boundAction|param> : include name after annotation
                    changed = includeSimpleTargetName(deletionRange, tokens, options, true);
                } else if (canIncludeAnnotateWithStatement(deletionRange, tokens, options)) {
                    // annotate <entity> with <annotation> : include 'annotate <entity> with ' before annotation
                    // annotate <entity> with <elementAnnotations> : include 'annotate <entity> with ' before annotation
                    changed = includeAnnotateWithStatement(deletionRange, tokens, options, annotationFile);
                } else if (canIncludeAnnotateWithStatement(deletionRange, tokens, options, true)) {
                    // annotate <entity> with actions <actionAnnotations> : include 'annotate <entity> with actions' before annotation
                    // find index of token 'annotate', and accept any target in the form <segment1>.<segment2>.<entityName>
                    changed = includeAnnotateWithStatement(deletionRange, tokens, options, annotationFile, true);
                } else if (canIncludeAnnotateWithStatement(deletionRange, tokens, options, true, true)) {
                    // annotate <entity> with <otherAnnos> actions <actionAnnotations> : include 'actions' before annotation
                    changed = includeAnnotateWithStatement(deletionRange, tokens, options, annotationFile, true, true);
                } else {
                    // TODO remove orphaned target elements/entities ?
                    changed = false;
                }
            } while (changed);
            deletionRange.isExpanded = true;
        });
}

function mergeDeletionRanges(tokens: CompilerToken[], deletionRanges: DeletionRange[]): boolean {
    let changed = false;
    for (let rangeIndex = 0; rangeIndex < deletionRanges.length; rangeIndex++) {
        const current = deletionRanges[rangeIndex];
        let doMerge: boolean;
        do {
            doMerge = false;
            const next = rangeIndex + 1 < deletionRanges.length ? deletionRanges[rangeIndex + 1] : null;
            if (next && current.termRange.end + 1 === next.termRange.start) {
                // merge possible if at most a single separator token is between deletion ranges
                const nonCommentTokenIndexes: number[] = [];
                let nextIndex = current.tokenRange.end;
                do {
                    nextIndex = getNeighboringTokenIndex(tokens, nextIndex, +1);
                    if (nextIndex > 0 && nextIndex < next.tokenRange.start) {
                        nonCommentTokenIndexes.push(nextIndex);
                    }
                } while (nextIndex > 0 && nextIndex < next.tokenRange.start);
                if (
                    nonCommentTokenIndexes.length === 0 ||
                    (nonCommentTokenIndexes.length === 1 &&
                        tokens[nonCommentTokenIndexes[0]].text === separatorForKind[current.kind])
                ) {
                    doMerge = true;
                }
                if (doMerge) {
                    // do the merge
                    current.termRange.end = next.termRange.end;
                    current.tokenRange.end = next.tokenRange.end;
                    current.isExpanded = false;
                    deletionRanges.splice(rangeIndex + 1, 1);
                    changed = true;
                }
            }
        } while (doMerge);
    }
    return changed;
}

function getNeighborIndex(tokens: CompilerToken[], index: number, next = false): number {
    let neighboringIndex = index + (next ? +1 : -1);
    if (!tokens[neighboringIndex]) {
        return -1;
    }
    while (isComment(tokens[neighboringIndex])) {
        neighboringIndex = neighboringIndex + (next ? +1 : -1);
        if (!tokens[neighboringIndex]) {
            return -1;
        }
    }
    return neighboringIndex;
}

/**
 * Get neighboring token index (ignoring comment tokens).
 *
 * @param tokens - All tokens in the document.
 * @param index - current token index.
 * @param offset - Token offset.
 * @returns Index of a token.
 */
function getNeighboringTokenIndex(tokens: CompilerToken[], index: number, offset: number): number {
    let resultIndex = index;
    for (let count = 0; count < Math.abs(offset) && resultIndex >= 0; count++) {
        resultIndex = getNeighborIndex(tokens, resultIndex, offset > 0);
    }
    return resultIndex;
}

/**
 * Can simple target name before/after annotation be included into deletion range?
 * i.e. <elementName|boundActionName|paramName> <annotation> or
 * <boundActionName> <annotatedParameter>.
 *
 * @param deletionRange - Deletion range.
 * @param tokens - All tokens in the document.
 * @param options - Deletion options.
 * @param nameIsAfter - Flag indicating where name is located.
 * @returns True if target name can be included in deletion range.
 */
function canIncludeSimpleTargetName(
    deletionRange: DeletionRange,
    tokens: CompilerToken[],
    options: Options,
    nameIsAfter?: boolean
): boolean {
    if (!options.includeTarget) {
        return false;
    }
    if (isEmbedded(tokens, deletionRange.tokenRange.start)) {
        return false;
    }
    if (deletionRange.printPattern === PrintPattern.boundParameter) {
        // cases: annotation on bound parameter and parameter bound action
        if (![DeletionRangeKind.ANNOTATION, DeletionRangeKind.TARGET_PARAMETER].includes(deletionRange.kind)) {
            return false;
        }
    } else if (deletionRange.kind !== DeletionRangeKind.ANNOTATION) {
        // for all other print patterns: deletion range needs to represent whole annotation
        return false;
    }
    let indexIdentifier = nameIsAfter ? options.afterTokenIndex : options.beforeTokenIndex;
    // skip comments token in between
    while (isComment(tokens[indexIdentifier])) {
        indexIdentifier = indexIdentifier + (nameIsAfter ? +1 : -1);
    }

    // check there are no further annotations targeting identifier
    let firstTokenIndex, lastTokenIndex;
    if (nameIsAfter) {
        firstTokenIndex = deletionRange.tokenRange.start;
        lastTokenIndex = indexIdentifier;
    } else {
        firstTokenIndex = indexIdentifier;
        lastTokenIndex = deletionRange.tokenRange.end;
    }
    if ([PrintPattern.element].includes(deletionRange.printPattern)) {
        if (
            !['{', ';'].includes(getNeighboringToken(tokens, firstTokenIndex, -1).text) ||
            !['}', ';'].includes(getNeighboringToken(tokens, lastTokenIndex, 1).text)
        ) {
            return false;
        }
    }

    switch (tokens[indexIdentifier]?.isIdentifier) {
        case 'Element':
        case 'ExtElement':
            return deletionRange.printPattern === PrintPattern.element;
        case 'Param':
        case 'ExtParam':
            return [PrintPattern.parameter, PrintPattern.boundParameter].includes(deletionRange.printPattern);
        case 'BoundAction':
        case 'ExtBoundAction':
            if (deletionRange.kind === DeletionRangeKind.TARGET_PARAMETER) {
                // target name is bound action - make sure it has no annotations itself
                if (!['{', ';'].includes(getNeighboringToken(tokens, indexIdentifier, -1)?.text)) {
                    return false;
                }
            }
            return [PrintPattern.boundAction, PrintPattern.boundParameter].includes(deletionRange.printPattern);
        default:
            return false;
    }
}
/**
 * Include simple target name before/after annotation into deletion range
 * i.e. <elementName|boundActionName|paramName> <annotation> or
 * <boundActionName> <annotatedParameter>.
 *
 * @param deletionRange - Deletion range.
 * @param tokens - All tokens in the document.
 * @param options - Deletion options.
 * @param nameIsAfter - Flag indicating where name is located.
 * @returns True if target name can be added to deletion range.
 */
function includeSimpleTargetName(
    deletionRange: DeletionRange,
    tokens: CompilerToken[],
    options: Options,
    nameIsAfter?: boolean
): boolean {
    // <element|boundAction|param> <annotation> : include name before/after annotation
    let changed = true;
    const checkIndex = nameIsAfter ? options.afterTokenIndex + 1 : options.afterTokenIndex;
    if (deletionRange.printPattern === PrintPattern.boundAction && hasParameterList(tokens, checkIndex)) {
        changed = false; // to be deleted bound action annotation is followed by parameter list - don't delete bound action name
    } else if (nameIsAfter) {
        deletionRange.tokenRange.end = getNeighboringTokenIndex(tokens, deletionRange.tokenRange.end, +1);
        deletionRange.kind = mapTokenIdentifierToKind(tokens[deletionRange.tokenRange.end]?.isIdentifier);
    } else {
        deletionRange.tokenRange.start = getNeighboringTokenIndex(tokens, deletionRange.tokenRange.start, -1);
        deletionRange.kind = mapTokenIdentifierToKind(tokens[deletionRange.tokenRange.start]?.isIdentifier);
    }
    return changed;
}

/**
 * Can include 'annotate with' statement
 * i.e. annotate <entity> with <annotation> : include 'annotate <entity> with ' before annotation
 * annotate <entity> with <elementAnnotations> : include 'annotate <entity> with ' before annotation
 * annotate <entity> with actions <actionAnnotations> : include 'annotate <entity> with actions' before annotation.
 *
 * @param deletionRange - Deletion range.
 * @param tokens - All tokens in the document.
 * @param options - Deletion options.
 * @param forAction - Check actions.
 * @param includeActionOnly - Delete only actions.
 * @returns True if `annotate with` can be deleted.
 */
function canIncludeAnnotateWithStatement(
    deletionRange: DeletionRange,
    tokens: CompilerToken[],
    options: Options,
    forAction?: boolean,
    includeActionOnly?: boolean
): boolean {
    if (!options.includeTarget) {
        return false;
    }
    if (deletionRange.kind === DeletionRangeKind.ANNOTATION) {
        if (deletionRange.printPattern !== PrintPattern.artifact) {
            return false;
        }
    } else if (deletionRange.kind === DeletionRangeKind.TARGET_ELEMENTS_LIST) {
        if (deletionRange.printPattern !== PrintPattern.element) {
            return false;
        }
    } else if (deletionRange.kind === DeletionRangeKind.TARGET_PARAMETER) {
        if (deletionRange.printPattern !== PrintPattern.parameter) {
            return false;
        }
    } else if (deletionRange.kind === DeletionRangeKind.TARGET_BOUND_ACTION) {
        if (![PrintPattern.boundAction, PrintPattern.boundParameter].includes(deletionRange.printPattern)) {
            return false;
        }
    } else {
        return false; // unsupported combination
    }
    if (getClosingTokenIndex(tokens, options.afterTokenIndex) < 0) {
        return false;
    } // annotate statement must be finished
    let beforeTokenIndex = options.beforeTokenIndex;
    while (isComment(tokens[beforeTokenIndex])) {
        --beforeTokenIndex;
    }
    if (forAction) {
        if (includeActionOnly) {
            return tokens[beforeTokenIndex].text.toUpperCase() === 'ACTIONS';
        } else {
            return (
                tokens[beforeTokenIndex].text.toUpperCase() === 'ACTIONS' &&
                getNeighboringToken(tokens, beforeTokenIndex, -1)?.text.toUpperCase() === 'WITH' &&
                ['Annotate', 'Extend', 'Ext'].includes(
                    getNeighboringToken(tokens, beforeTokenIndex, -2)?.isIdentifier ?? ''
                )
            );
        }
    } else {
        return (
            tokens[beforeTokenIndex].text.toUpperCase() === 'WITH' &&
            ['Annotate', 'Extend', 'Ext'].includes(
                getNeighboringToken(tokens, beforeTokenIndex, -1)?.isIdentifier ?? ''
            )
        );
    }
}

/**
 * Check if annotation is present before tokenIndex (pointing to 'annotate' keyword)
 * which targets the target of the 'annotate' statement.
 *
 * @param position - Start position of 'annotate' keyword.
 * @param annotationFile - Internal representation root.
 * @returns True if there are relevant annotations before the position.
 */
function annotationsPresentBefore(position: Position, annotationFile: AnnotationFile): boolean {
    // find target for annotation term positioned immediately before tokenIndex
    let targetOfPreviousAnnotation: Target | undefined;
    let previousTermEndPosition: Position; // closest term end position before tokenIndex

    annotationFile.targets.forEach((target) => {
        target.terms.forEach((term) => {
            const termRangeEndPosition = term.attributes?.['Term']?.valueRange?.end;
            if (termRangeEndPosition && isBefore(termRangeEndPosition, position)) {
                if (!previousTermEndPosition || isBefore(previousTermEndPosition, termRangeEndPosition)) {
                    previousTermEndPosition = termRangeEndPosition;
                    targetOfPreviousAnnotation = target;
                }
            }
        });
    });
    // if that target is starting after tokenIndexPosition, then current 'annotate' statement must not be deleted
    // example:
    // @title: 'foo' // this annotation targets "AdminService.Books"
    // annotate AdminService.Books with { ...  // don't delete, otherwise @title is orphaned
    return (
        !!targetOfPreviousAnnotation?.nameRange?.end && isBefore(position, targetOfPreviousAnnotation?.nameRange?.end)
    );
}

/**
 * Can preceding comment be included in deletion range ?
 *
 * @param tokens - All tokens in the document.
 * @param options - Deletion options.
 * @returns True if preceding comment can be added to deletion range.
 */
function canIncludePrecedingComment(tokens: CompilerToken[], options: Options): boolean {
    const { beforeTokenIndex } = options;
    const commentToken = tokens[beforeTokenIndex];
    if (!commentToken || !isComment(commentToken)) {
        return false;
    }
    // token represents a comment
    if (beforeTokenIndex === 0) {
        return true;
    } // file starts with this comment

    // comments are "associated" with current annotation only if they spans the whole line
    // (otherwise it is considered line end comment of previous content)
    const precedingNonCommentToken = getNeighboringToken(tokens, beforeTokenIndex, -1);
    return !precedingNonCommentToken || precedingNonCommentToken.line < commentToken.line;
}

/**
 * Include preceding comment.
 *
 * @param deletionRange - Deletion range.
 * @param options - Deletion options.
 */
function includePrecedingComment(deletionRange: DeletionRange, options: Options): void {
    deletionRange.tokenRange.start = options.beforeTokenIndex;
}

/**
 * Can subsequent comment be included in deletion range ?
 *
 * @param deletionRange - Deletion range.
 * @param tokens - All tokens in the document.
 * @param options - Deletion options.
 * @returns True if subsequent comment can be deleted.
 */
function canIncludeSubsequentComment(deletionRange: DeletionRange, tokens: CompilerToken[], options: Options): boolean {
    const { afterTokenIndex } = options;
    const commentToken = tokens[afterTokenIndex];
    if (!isComment(commentToken)) {
        return false;
    }
    // token represents a comment
    // comments are "associated" with current range only if it is in same line as range end and next non-comment token is in next line
    if (commentToken.line > tokens[deletionRange.tokenRange.end].line) {
        return false;
    } // comment not in same line
    const nextToken = getNeighboringToken(tokens, afterTokenIndex, +1);
    return !nextToken || nextToken.line > commentToken.line; // make sure no further non-comment token after comment
}

/**
 * Include subsequent comment.
 *
 * @param deletionRange - Deletion range.
 * @param options - Deletion options.
 */
function includeSubsequentComment(deletionRange: DeletionRange, options: Options): void {
    deletionRange.tokenRange.end = options.afterTokenIndex;
}

/**
 * Can surrounding brackets be included in deletion range ?
 *
 * @param deletionRange - Deletion range.
 * @param tokens - All tokens in the document.
 * @param options - Deletion options.
 * @param asCurlyBracket - True if `{}` should be checked otherwise `() will be checked.
 * @returns True if surrounding brackets can be deleted.
 */
function canIncludeSurroundingBrackets(
    deletionRange: DeletionRange,
    tokens: CompilerToken[],
    options: Options,
    asCurlyBracket?: boolean
): boolean {
    const { separator } = options;
    const beforeTokenIndex = getNeighboringTokenIndex(tokens, deletionRange.tokenRange.start, -1);
    const afterTokenIndex = getNeighboringTokenIndex(tokens, deletionRange.tokenRange.end, +1);
    const openingBracket = asCurlyBracket ? '{' : '(';
    const closingBracket = asCurlyBracket ? '}' : ')';
    const supportedKinds = asCurlyBracket
        ? [DeletionRangeKind.TERM_NAME, DeletionRangeKind.TARGET_ELEMENT, DeletionRangeKind.TARGET_BOUND_ACTION]
        : [DeletionRangeKind.TERM_FQ_NAME, DeletionRangeKind.TARGET_PARAMETER];
    if (!supportedKinds.includes(deletionRange.kind)) {
        return false;
    }
    if (tokens[beforeTokenIndex].text !== openingBracket) {
        return false;
    }
    return (
        tokens[afterTokenIndex].text === closingBracket ||
        (tokens[afterTokenIndex].text === separator &&
            getNeighboringToken(tokens, afterTokenIndex, +1)?.text === closingBracket)
    );
}

/**
 * Include surrounding brackets into deletion range.
 *
 * @param deletionRange - Deletion range.
 * @param tokens - All tokens in the document.
 * @param options - Deletion options.
 * @param asCurlyBracket - True if `{}` should be checked otherwise `() will be checked.
 */
function includeSurroundingBrackets(
    deletionRange: DeletionRange,
    tokens: CompilerToken[],
    options: Options,
    asCurlyBracket?: boolean
): void {
    // { <termNameWithValue> } : extend range to include surrounding curly brackets
    // { <targetElement with annotations> } : extend range to include surrounding curly brackets
    const { vocabularyAliases } = options;
    const beforeTokenIndex = getNeighboringTokenIndex(tokens, deletionRange.tokenRange.start, -1);
    const afterTokenIndex = getNeighboringTokenIndex(tokens, deletionRange.tokenRange.end, +1);
    const closingBracket = asCurlyBracket ? '}' : ')';
    deletionRange.tokenRange = {
        start: beforeTokenIndex,
        end:
            tokens[afterTokenIndex].text === closingBracket
                ? afterTokenIndex
                : getNeighboringTokenIndex(tokens, afterTokenIndex, +1)
    };
    if (
        asCurlyBracket &&
        deletionRange.kind === DeletionRangeKind.TERM_NAME &&
        getNeighboringToken(tokens, beforeTokenIndex, -1)?.text === ':' &&
        vocabularyAliases.has(getNeighboringToken(tokens, beforeTokenIndex, -2)?.text)
    ) {
        // <VocabularyALias>: <termNameWithValue> : include vocabulary alias name and colon
        deletionRange.tokenRange.start = getNeighboringTokenIndex(tokens, beforeTokenIndex, -2);
        deletionRange.kind = DeletionRangeKind.TERM_FQ_NAME;
    } else if (asCurlyBracket && deletionRange.kind === DeletionRangeKind.TARGET_ELEMENT) {
        deletionRange.kind = DeletionRangeKind.TARGET_ELEMENTS_LIST;
    }
}

/**
 * Include 'annotate with' statement
 * i.e. annotate <entity> with <annotation> : include 'annotate <entity> with ' before annotation
 * annotate <entity> with <elementAnnotations> : include 'annotate <entity> with ' before annotation
 * annotate <entity> with actions <actionAnnotations> : include 'annotate <entity> with actions' before annotation.
 *
 * @param deletionRange - Deletion range.
 * @param tokens - All tokens in the document.
 * @param options - Deletion options.
 * @param annotationFile - Internal representation root.
 * @param forAction - Deletion of actions.
 * @param withActionOnly - Deletes only actions.
 * @returns True if annotate statement can be deleted.
 */
function includeAnnotateWithStatement(
    deletionRange: DeletionRange,
    tokens: CompilerToken[],
    options: Options,
    annotationFile: AnnotationFile,
    forAction?: boolean,
    withActionOnly?: boolean
): boolean {
    let beforeTokenIndex = options.beforeTokenIndex;
    while (isComment(tokens[beforeTokenIndex])) {
        --beforeTokenIndex;
    }
    let startDeletionTokenIndex = beforeTokenIndex;
    if (!withActionOnly) {
        startDeletionTokenIndex = getNeighboringTokenIndex(tokens, startDeletionTokenIndex, forAction ? -3 : -2);
    }
    let changed = false;
    if (!withActionOnly) {
        // find index of token 'annotate', and accept any target in the form <segment1>.<segment2>.<entityName>
        let done = false;
        while (!done) {
            if (tokens[startDeletionTokenIndex].text.toUpperCase() === 'ANNOTATE') {
                done = true;
            } else if (tokens[startDeletionTokenIndex].text === '.') {
                startDeletionTokenIndex--; // accepted as part of target
            } else if (['Annotate', 'Extend', 'Ext'].includes(tokens[startDeletionTokenIndex]?.isIdentifier || '')) {
                startDeletionTokenIndex--; // accepted as part of target
            } else if (isComment(tokens[startDeletionTokenIndex])) {
                startDeletionTokenIndex--; // include comment
            } else {
                startDeletionTokenIndex = -1; // anything else found: don't delete this
                done = true;
            }
        }
    }
    const closingSemicolonIndex = getClosingTokenIndex(tokens, deletionRange.tokenRange.end);
    if (startDeletionTokenIndex > -1 && closingSemicolonIndex > -1) {
        // semicolon will be deleted as neighboring sibling separator
        deletionRange.tokenRange.end = closingSemicolonIndex - 1;
        const startDeletionPosition = getPositionFromToken(tokens[startDeletionTokenIndex]);
        if (withActionOnly) {
            deletionRange.tokenRange.start = startDeletionTokenIndex;
            deletionRange.kind = DeletionRangeKind.TARGET_FROM_WITH;
        } else if (startDeletionPosition && annotationsPresentBefore(startDeletionPosition, annotationFile)) {
            // only remove from the 'with' token - keep 'annotate <target>;' for preceding annotations
            deletionRange.tokenRange.start = forAction
                ? getNeighboringTokenIndex(tokens, beforeTokenIndex, -1)
                : beforeTokenIndex;
            deletionRange.kind = DeletionRangeKind.TARGET_FROM_WITH;
        } else {
            deletionRange.tokenRange.start = startDeletionTokenIndex;
            deletionRange.kind = DeletionRangeKind.TARGET_ARTIFACT;
        }
        changed = true;
    }
    return changed;
}

/**
 * UTILS
 */

/**
 * Find out if annotation is embedded
 * - i.e. search until preceding ';' or begin of file
 * - when finding 'annotate': not embedded
 * - when finding 'action' or 'function': embedded
 * - when finding none: consider embedded (to not delete metadata, can happen for element in element list).
 *
 * @param tokens - All tokens in the document.
 * @param startIndex - Start token index.
 * @returns True if annotation is embedded.
 */
function isEmbedded(tokens: CompilerToken[], startIndex: number): boolean {
    let annotateFound = false;
    let actionFunctionFound = false;
    let semicolonFound = false;
    let index = startIndex;
    while (index && !annotateFound && !actionFunctionFound && !semicolonFound) {
        index--;
        const token = tokens[index];
        if (token.text.toUpperCase() === 'ANNOTATE') {
            annotateFound = true;
        } else if (['ACTION', 'FUNCTION'].includes(token.text.toUpperCase())) {
            actionFunctionFound = true;
        } else if (token.text === ';') {
            semicolonFound = true;
        }
    }
    return actionFunctionFound ? true : !annotateFound;
}

function isComment(token: CompilerToken): boolean {
    return token?.text?.startsWith('//') || token?.text?.startsWith('/*');
}

/**
 * Get neighboring token (ignoring comment tokens).
 *
 * @param tokens - All tokens in the document.
 * @param index - Current token index.
 * @param offset - Token offset.
 * @returns Neighboring token.
 */
function getNeighboringToken(tokens: CompilerToken[], index: number, offset: number): CompilerToken {
    return tokens[getNeighboringTokenIndex(tokens, index, offset)];
}

/**
 * Get closing token index
 * - returns -1 if '(' or '{' is present before start of next statement (or end of file)
 * - looks forward in token stream until next cds key word, '@', '(', '{', ';' or end of file.
 *
 * @param tokens - All tokens in the document.
 * @param startIndex - Start token index.
 * @returns Token index.
 */
function getClosingTokenIndex(tokens: CompilerToken[], startIndex: number): number {
    let annoOrBracketPresent = false;
    let closingTokenIndex = -1;
    let commentStartIndex = -1; // start index of trailing comments
    let index = startIndex;
    while (index && tokens[index] && closingTokenIndex === -1 && !annoOrBracketPresent) {
        const token = tokens[index];
        if ([';', '@'].includes(token.text)) {
            // ';': semicolon terminates current annotate statement (but is not mandatory!)
            // '@': starts annotation targeting next statement
            //    (this is not possible: element/parameter list could be followed by annotations of entity/action)
            // only include trailing comments if they are followed by a semicolon
            closingTokenIndex = token.text !== ';' && commentStartIndex > 0 ? commentStartIndex : index;
        } else if (cdsKeywords.includes((token.text || '').toUpperCase())) {
            // start of next CDS statement
            closingTokenIndex = commentStartIndex > 0 ? commentStartIndex : index;
        } else if (['(', '{'].includes(token.text)) {
            // '(': action or bound action as target could be followed by parameter list
            // '{': entity could be followed by element list
            annoOrBracketPresent = true;
        }
        if (commentStartIndex < 0 && isComment(token)) {
            commentStartIndex = index;
        }
        if (commentStartIndex > 0 && !isComment(token)) {
            commentStartIndex = -1;
        }
        index++;
    }
    return closingTokenIndex;
}

/**
 * Map token identifier (token for name which is included into deletion range) to DeletionRangeKind.
 *
 * @param identifierKind - Identifier kind.
 * @returns Deletion range kind.
 */
function mapTokenIdentifierToKind(identifierKind: string | undefined): DeletionRangeKind {
    switch (identifierKind) {
        case 'Element':
        case 'ExtElement':
            return DeletionRangeKind.TARGET_ELEMENT;
        case 'BoundAction':
        case 'ExtBoundAction':
            return DeletionRangeKind.TARGET_BOUND_ACTION;
        case 'Param':
        case 'ExtParam':
            return DeletionRangeKind.TARGET_PARAMETER;
        default:
            return DeletionRangeKind.UNDEFINED;
    }
}

/**
 * Find out if parameter list starts i.e. if '(' occurs before '}'.
 *
 * @param tokens - All tokens in the document.
 * @param startIndex - Start token index.
 * @returns True if annotate statement contains parameter list.
 */
function hasParameterList(tokens: CompilerToken[], startIndex: number): boolean {
    let bracketPresent = false;
    let curlyBracketFound = false;
    let index = startIndex;
    while (index && tokens[index] && !curlyBracketFound && !bracketPresent) {
        const token = tokens[index];
        if (token.text === '}') {
            curlyBracketFound = true;
        } else if (token.text === '(') {
            // '(': action or bound action as target could be followed by parameter list
            bracketPresent = true;
        }
        index++;
    }
    return bracketPresent;
}

function getPositionFromToken(token: CompilerToken | undefined, endPosition = false): Position | undefined {
    if (!token) {
        return undefined;
    }
    const offset = endPosition ? token.text.length : 0;
    return Position.create(token.line - 1, token.column + offset);
}

function getRangeFromTokenRange(
    tokens: CompilerToken[],
    tokenRange: IndexRange,
    previousSeparatorIncluded?: boolean,
    siblingSeparatorFound?: boolean
): Range | undefined {
    const doNotExpandToAfterEndToken = !siblingSeparatorFound && previousSeparatorIncluded; // the case when last annotation in a group is being deleted, to preserve group closing bracket indentation
    const startToken = tokens[tokenRange.start];
    const endToken = tokens[tokenRange.end + (doNotExpandToAfterEndToken ? 0 : 1)];
    const startPosition = getPositionFromToken(startToken);
    const endPosition = getPositionFromToken(endToken, doNotExpandToAfterEndToken);
    if (startPosition && endPosition) {
        return Range.create(startPosition, endPosition);
    }
    return undefined;
}

function includeSiblingSeparator(
    tokens: CompilerToken[],
    deletionRange: DeletionRange
): { deletionRange: DeletionRange; siblingSeparatorFound?: boolean; previousSeparatorIncluded?: boolean } {
    const separator = separatorForKind[deletionRange.kind];
    if (!separator) {
        return { deletionRange };
    }
    const endTokenIndex = deletionRange.tokenRange.end;
    const nextTokenIndex = getNeighboringTokenIndex(tokens, endTokenIndex, +1);
    const nextToken = tokens[nextTokenIndex];
    let siblingSeparatorFound = false;
    let previousSeparatorIncluded = false;
    if (nextToken && nextToken.text === separator) {
        // extend deletion range to include separator
        deletionRange.tokenRange.end = nextTokenIndex;
        siblingSeparatorFound = true;
        // include line comment in same line
        const commentToken = tokens[deletionRange.tokenRange.end + 1];
        if (commentToken?.text.startsWith('//')) {
            if (tokens[deletionRange.tokenRange.end].line === commentToken.line) {
                ++deletionRange.tokenRange.end;
            }
        }
    }
    if (!siblingSeparatorFound) {
        const startTokenIndex = deletionRange.tokenRange.start;
        const previousTokenIndex = getNeighboringTokenIndex(tokens, startTokenIndex, -1);
        const previousToken = tokens[previousTokenIndex];
        if (previousToken.text === separator && deletionRange.kind !== DeletionRangeKind.TARGET_ARTIFACT) {
            // extend deletion range to include separator (except for whole annotate statement, there ';' might be needed)
            deletionRange.tokenRange.start = previousTokenIndex;
            previousSeparatorIncluded = true;
        }
    }
    return { deletionRange, siblingSeparatorFound, previousSeparatorIncluded };
}
