import { positionAt } from './position';
import { Position, Range } from 'vscode-languageserver-types';
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

/**
 * Checks if given positions are equal.
 *
 * @param a Position 1
 * @param b Position 2
 * @returns True if positions are equal
 */
export function arePositionsEqual(a: Position, b: Position): boolean {
    return a.line === b.line && a.character === b.character;
}

/**
 * Checks if given ranges are equal.
 *
 * @param a Range 1
 * @param b Range 2
 * @returns True if ranges are equal
 */
export function areRangesEqual(a: Range, b: Range): boolean {
    return arePositionsEqual(a.start, b.start) && arePositionsEqual(a.end, b.end);
}

export const copyPosition = (position: Position): Position => Position.create(position.line, position.character);

export const copyRange = (range: Range): Range => Range.create(copyPosition(range.start), copyPosition(range.end));

/**
 * Cretaes range by given coordinates.
 *
 * @param line1
 * @param character1
 * @param line2
 * @param character2
 * @returns range object
 */
export function createRange(line1: number, character1: number, line2: number, character2: number): Range {
    return Range.create(Position.create(line1, character1), Position.create(line2, character2));
}

export const createRangeWithPosition = (start: Position | undefined, end: Position | undefined): Range | undefined =>
    start && end ? Range.create(copyPosition(start), copyPosition(end)) : undefined; //hint: used as createRange in cds converter package . will remove comments after consumption.
