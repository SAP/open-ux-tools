import type { XMLElement, SourcePosition } from '@xml-tools/ast';
import { Range } from '@sap-ux/odata-annotation-core-types';

/**
 * Converts @xml-tools/ast ranges where lines and columns start with 1.
 *
 * @param position @xml-tools/ast range.
 * @returns Range where lines and columns start with 0.
 */
export function transformRange(position: SourcePosition | undefined): Range | undefined {
    return position
        ? Range.create(position.startLine - 1, position.startColumn - 1, position.endLine - 1, position.endColumn)
        : undefined;
}

/**
 * Converts @xml-tools/ast ranges where lines and columns start with 1.
 * This can only be used with XML element, but it offers more accurate range in case of syntax errors.
 *
 * @param position @xml-tools/ast range.
 * @param element XML element for which the range belongs. Using different position may lead to unexpected behavior.
 * @returns Range where lines and columns start with 0.
 */
export function transformElementRange(position: SourcePosition | undefined, element: XMLElement): Range | undefined {
    const range = transformRange(position);
    if (range && element.syntax.guessedAttributesRange) {
        // guessed attribute range only has offset and we do not know how to resolve them here.
        // heuristic to support code completion for attribute names that are in a tag, which is not closed
        range.end.character++;
    }
    return range;
}

/**
 * Creates a range between two SourcePositions.
 *
 * @param begin SourcePosition from which the end will be used
 * @param end SourcePosition from which the start will be used
 * @returns Range between the begin and end positions
 */
export function getGapRangeBetween(
    begin: SourcePosition | undefined,
    end: SourcePosition | undefined
): Range | undefined {
    if (begin && end) {
        return Range.create(begin.endLine - 1, begin.endColumn, end.startLine - 1, end.startColumn - 3);
    }
    return undefined;
}

/**
 * Mutates range by the given parameters.
 *
 * @param range Range object that will be changed.
 * @param startColAdjust Number which will be added to the start positions column.
 * @param endColAdjust Number which will be added to the end position column.
 * @param startLineAdjust Number which will be added to the start position line.
 * @param endLineAdjust Number which will be added to the end position line.
 */
export function adjustRange(
    range: Range,
    startColAdjust: number,
    endColAdjust: number,
    startLineAdjust = 0,
    endLineAdjust = 0
): void {
    if (range) {
        range.start.line += startLineAdjust;
        range.start.character += startColAdjust;
        range.end.line += endLineAdjust;
        range.end.character += endColAdjust;
    }
}
