import { Position, Range } from '@sap-ux/text-document-utils';

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
