import { Position, positionAt } from './position';
/**
 * A range in a text document expressed as (zero-based) start and end positions.
 *
 * If you want to specify a range that contains a line including the line ending
 * character(s) then use an end position denoting the start of the next line.
 * For example:
 * ```ts
 * {
 *     start: { line: 5, character: 23 }
 *     end : { line 6, character : 0 }
 * }
 * ```
 *
 * @description copied from: node_modules\vscode-languageserver-types\lib\umd\main.d.ts. To keep source code lightweight since it depends only on `Range`
 */
export interface Range {
    /**
     * The range's start position
     */
    start: Position;
    /**
     * The range's end position.
     */
    end: Position;
}

function createRange(start: Position, end: Position): Range;
function createRange(startLine: number, startCharacter: number, endLine: number, endCharacter: number): Range;
/**
 * Create range.
 *
 * @param one position or number
 * @param two position or number
 * @param three number
 * @param four number
 * @returns range
 */
function createRange(one: Position | number, two: Position | number, three?: number, four?: number): Range {
    if (
        typeof one === 'number' &&
        !isNaN(one) &&
        typeof two === 'number' &&
        !isNaN(two) &&
        typeof three === 'number' &&
        !isNaN(three) &&
        typeof four === 'number' &&
        !isNaN(four)
    ) {
        return {
            start: Position.create(one, two),
            end: Position.create(three, four)
        };
    } else if (typeof one === 'object' && typeof two === 'object') {
        return {
            start: one,
            end: two
        };
    }
    throw new Error(`Range#create called with invalid arguments ${one}, ${two}, ${three}, ${four}`);
}

export const Range = {
    create: createRange
};

/**
 * Create range.
 *
 * @param lineOffsets line offset
 * @param start start point
 * @param end end point
 * @param textLength text length
 * @returns range
 */
export function rangeAt(lineOffsets: number[], start: number, end: number, textLength: number): Range {
    return Range.create(positionAt(lineOffsets, start, textLength), positionAt(lineOffsets, end, textLength));
}
