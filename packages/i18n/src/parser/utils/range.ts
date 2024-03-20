import { positionAt } from './position';
import { Range } from './language-server';

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
