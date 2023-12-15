import { Position, Range } from 'vscode-languageserver-types';

/**
 * Checks if given positions are equal.
 *
 * @param a
 * @param b
 * @returns true if positions are equal
 */
export function arePositionsEqual(a: Position, b: Position): boolean {
    return a.line === b.line && a.character === b.character;
}

/**
 * Checks if given ranges are equal.
 *
 * @param a
 * @param b
 * @returns true if ranges are equal
 */
export function areRangesEqual(a: Range, b: Range): boolean {
    return arePositionsEqual(a.start, b.start) && arePositionsEqual(a.end, b.end);
}

export const copyPosition = (position: Position): Position => Position.create(position.line, position.character);

export const copyRange = (range: Range): Range => Range.create(copyPosition(range.start), copyPosition(range.end));
