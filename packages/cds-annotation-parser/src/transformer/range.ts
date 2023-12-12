import { Position, Range } from 'vscode-languageserver-types';

export function arePositionsEqual(a: Position, b: Position): boolean {
    return a.line === b.line && a.character === b.character;
}

export function areRangesEqual(a: Range, b: Range): boolean {
    return arePositionsEqual(a.start, b.start) && arePositionsEqual(a.end, b.end);
}

export const copyPosition = (position: Position): Position => Position.create(position.line, position.character);

export const copyRange = (range: Range): Range => Range.create(copyPosition(range.start), copyPosition(range.end));
