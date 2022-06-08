import type { XMLElement, SourcePosition } from '@xml-tools/ast';
import { Range } from '@sap-ux/odata-annotation-core';

export function transformRange(position: SourcePosition): Range | undefined {
    return position
        ? Range.create(position.startLine - 1, position.startColumn - 1, position.endLine - 1, position.endColumn)
        : undefined;
}

export function transformElementRange(position: SourcePosition, element: XMLElement): Range | undefined {
    const range = transformRange(position);
    if (range && element.syntax.guessedAttributesRange) {
        // guessed attribute range only has offset and we do not know how to resolve them here.
        // heuristic to support code completion for attribute names that are in a tag, which is not closed
        range.end.character++;
    }
    return range;
}

export function getGapRangeBetween(begin: SourcePosition, end: SourcePosition): Range | undefined {
    if (begin && end) {
        return Range.create(begin.endLine - 1, begin.endColumn, end.startLine - 1, end.startColumn - 3);
    }
    return undefined;
}

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
