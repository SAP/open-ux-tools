import { Position, Range } from '@sap-ux/odata-annotation-core';

export const copyPosition = (position: Position): Position => Position.create(position.line, position.character);

export const copyRange = (range: Range | undefined): Range | undefined =>
    range ? Range.create(copyPosition(range.start), copyPosition(range.end)) : undefined;
export const createRange = (start: Position | undefined, end: Position | undefined): Range | undefined =>
    start && end ? Range.create(copyPosition(start), copyPosition(end)) : undefined;
