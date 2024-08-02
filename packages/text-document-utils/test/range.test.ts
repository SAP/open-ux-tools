import { Position, Range } from 'vscode-languageserver-types';
import {
    arePositionsEqual,
    areRangesEqual,
    copyPosition,
    copyRange,
    createRange,
    createRangeWithPosition,
    rangeAt
} from '../src/range';

describe('areRangesEqual', () => {
    it('should return true for ranges with the same start and end positions', () => {
        const range1 = Range.create(Position.create(1, 5), Position.create(2, 10));
        const range2 = Range.create(Position.create(1, 5), Position.create(2, 10));

        expect(areRangesEqual(range1, range2)).toBe(true);
    });

    it('should return false for ranges with different start positions', () => {
        const range1 = Range.create(Position.create(1, 5), Position.create(2, 10));
        const range2 = Range.create(Position.create(1, 6), Position.create(2, 10));

        expect(areRangesEqual(range1, range2)).toBe(false);
    });

    it('should return false for ranges with different end positions', () => {
        const range1 = Range.create(Position.create(1, 5), Position.create(2, 10));
        const range2 = Range.create(Position.create(1, 5), Position.create(2, 11));

        expect(areRangesEqual(range1, range2)).toBe(false);
    });

    it('should return false for ranges with different start and end positions', () => {
        const range1 = Range.create(Position.create(1, 5), Position.create(2, 10));
        const range2 = Range.create(Position.create(1, 6), Position.create(2, 11));

        expect(areRangesEqual(range1, range2)).toBe(false);
    });

    it('should handle ranges with start and end positions at zero', () => {
        const range1 = Range.create(Position.create(0, 0), Position.create(0, 0));
        const range2 = Range.create(Position.create(0, 0), Position.create(0, 0));

        expect(areRangesEqual(range1, range2)).toBe(true);
    });

    it('should handle ranges with large values', () => {
        const range1 = Range.create(Position.create(1000, 1000), Position.create(2000, 2000));
        const range2 = Range.create(Position.create(1000, 1000), Position.create(2000, 2000));

        expect(areRangesEqual(range1, range2)).toBe(true);
    });
});

describe('arePositionsEqual', () => {
    it('should return true for positions with the same line and character', () => {
        const pos1 = Position.create(1, 5);
        const pos2 = Position.create(1, 5);

        expect(arePositionsEqual(pos1, pos2)).toBe(true);
    });

    it('should return false for positions with different lines', () => {
        const pos1 = Position.create(1, 5);
        const pos2 = Position.create(2, 5);

        expect(arePositionsEqual(pos1, pos2)).toBe(false);
    });

    it('should return false for positions with different characters', () => {
        const pos1 = Position.create(1, 5);
        const pos2 = Position.create(1, 6);

        expect(arePositionsEqual(pos1, pos2)).toBe(false);
    });

    it('should return false for positions with different lines and characters', () => {
        const pos1 = Position.create(1, 5);
        const pos2 = Position.create(2, 6);

        expect(arePositionsEqual(pos1, pos2)).toBe(false);
    });

    it('should handle positions with line and character at zero', () => {
        const pos1 = Position.create(0, 0);
        const pos2 = Position.create(0, 0);

        expect(arePositionsEqual(pos1, pos2)).toBe(true);
    });

    it('should handle positions with large line and character values', () => {
        const pos1 = Position.create(1000, 1000);
        const pos2 = Position.create(1000, 1000);

        expect(arePositionsEqual(pos1, pos2)).toBe(true);
    });
});

describe('rangeAt', () => {
    it('should create a range from start to end positions based on line offsets', () => {
        const lineOffsets = [0, 10, 20, 30]; // Mock line offsets for lines starting at 0, 10, 20, 30
        const start = 5;
        const end = 15;
        const textLength = 40;

        const expectedStart = Position.create(0, 5); // Position at line 0, character 5
        const expectedEnd = Position.create(1, 5); // Position at line 1, character 5

        const result = rangeAt(lineOffsets, start, end, textLength);

        expect(result).toEqual(Range.create(expectedStart, expectedEnd));
    });

    it('should handle positions within the same line', () => {
        const lineOffsets = [0, 10, 20, 30];
        const start = 12;
        const end = 18;
        const textLength = 40;

        const expectedStart = Position.create(1, 2); // Position at line 1, character 2
        const expectedEnd = Position.create(1, 8); // Position at line 1, character 8

        const result = rangeAt(lineOffsets, start, end, textLength);

        expect(result).toEqual(Range.create(expectedStart, expectedEnd));
    });

    it('should handle positions at the end of the text', () => {
        const lineOffsets = [0, 10, 20, 30];
        const start = 35;
        const end = 39;
        const textLength = 40;

        const expectedStart = Position.create(3, 5); // Position at line 3, character 5
        const expectedEnd = Position.create(3, 9); // Position at line 3, character 9

        const result = rangeAt(lineOffsets, start, end, textLength);

        expect(result).toEqual(Range.create(expectedStart, expectedEnd));
    });
});

describe('createRange', () => {
    it('should create a range from the given line and character positions', () => {
        const line1 = 1;
        const character1 = 5;
        const line2 = 3;
        const character2 = 15;

        const expectedStart = Position.create(line1, character1);
        const expectedEnd = Position.create(line2, character2);

        const result = createRange(line1, character1, line2, character2);

        expect(result).toEqual(Range.create(expectedStart, expectedEnd));
    });

    it('should handle ranges within the same line', () => {
        const line1 = 2;
        const character1 = 8;
        const line2 = 2;
        const character2 = 20;

        const expectedStart = Position.create(line1, character1);
        const expectedEnd = Position.create(line2, character2);

        const result = createRange(line1, character1, line2, character2);

        expect(result).toEqual(Range.create(expectedStart, expectedEnd));
    });

    it('should handle ranges where the start and end positions are the same', () => {
        const line1 = 4;
        const character1 = 10;
        const line2 = 4;
        const character2 = 10;

        const expectedStart = Position.create(line1, character1);
        const expectedEnd = Position.create(line2, character2);

        const result = createRange(line1, character1, line2, character2);

        expect(result).toEqual(Range.create(expectedStart, expectedEnd));
    });

    it('should handle ranges from the start to the end of the document', () => {
        const line1 = 0;
        const character1 = 0;
        const line2 = 5;
        const character2 = 25;

        const expectedStart = Position.create(line1, character1);
        const expectedEnd = Position.create(line2, character2);

        const result = createRange(line1, character1, line2, character2);

        expect(result).toEqual(Range.create(expectedStart, expectedEnd));
    });
});

describe('createRangeWithPosition', () => {
    it('should create a range when both start and end positions are defined', () => {
        const start = Position.create(1, 5);
        const end = Position.create(3, 15);

        const expectedStart = Position.create(1, 5);
        const expectedEnd = Position.create(3, 15);

        const result = createRangeWithPosition(start, end);

        expect(result).toEqual(Range.create(expectedStart, expectedEnd));
    });

    it('should return undefined when start position is undefined', () => {
        const start = undefined;
        const end = Position.create(3, 15);

        const result = createRangeWithPosition(start, end);

        expect(result).toBeUndefined();
    });

    it('should return undefined when end position is undefined', () => {
        const start = Position.create(1, 5);
        const end = undefined;

        const result = createRangeWithPosition(start, end);

        expect(result).toBeUndefined();
    });

    it('should return undefined when both start and end positions are undefined', () => {
        const start = undefined;
        const end = undefined;

        const result = createRangeWithPosition(start, end);

        expect(result).toBeUndefined();
    });

    it('should create a range when start and end positions are the same', () => {
        const start = Position.create(2, 10);
        const end = Position.create(2, 10);

        const expectedStart = Position.create(2, 10);
        const expectedEnd = Position.create(2, 10);

        const result = createRangeWithPosition(start, end);

        expect(result).toEqual(Range.create(expectedStart, expectedEnd));
    });
});

describe('copyPosition', () => {
    it('should create a new Position with the same line and character values', () => {
        const originalPosition = Position.create(3, 10);
        const copiedPosition = copyPosition(originalPosition);

        expect(copiedPosition).toEqual(originalPosition);
    });

    it('should handle positions with line and character values at zero', () => {
        const originalPosition = Position.create(0, 0);
        const copiedPosition = copyPosition(originalPosition);

        expect(copiedPosition).toEqual(originalPosition);
    });

    it('should handle positions with large line and character values', () => {
        const originalPosition = Position.create(1000, 1000);
        const copiedPosition = copyPosition(originalPosition);

        expect(copiedPosition).toEqual(originalPosition);
    });

    it('should create a distinct Position object (reference test)', () => {
        const originalPosition = Position.create(5, 15);
        const copiedPosition = copyPosition(originalPosition);

        expect(copiedPosition).not.toBe(originalPosition); // Checks that they are different references
        expect(copiedPosition.line).toBe(originalPosition.line);
        expect(copiedPosition.character).toBe(originalPosition.character);
    });
});

describe('copyRange', () => {
    it('should create a new Range with the same start and end positions', () => {
        const originalRange = Range.create(Position.create(1, 5), Position.create(2, 10));
        const copiedRange = copyRange(originalRange);

        expect(copiedRange.start).toEqual(originalRange.start);
        expect(copiedRange.end).toEqual(originalRange.end);
    });

    it('should handle ranges with start and end positions at zero', () => {
        const originalRange = Range.create(Position.create(0, 0), Position.create(0, 0));
        const copiedRange = copyRange(originalRange);

        expect(copiedRange.start).toEqual(originalRange.start);
        expect(copiedRange.end).toEqual(originalRange.end);
    });

    it('should handle ranges with large start and end position values', () => {
        const originalRange = Range.create(Position.create(1000, 1000), Position.create(2000, 2000));
        const copiedRange = copyRange(originalRange);

        expect(copiedRange.start).toEqual(originalRange.start);
        expect(copiedRange.end).toEqual(originalRange.end);
    });

    it('should create a distinct Range object (reference test)', () => {
        const originalRange = Range.create(Position.create(5, 15), Position.create(10, 20));
        const copiedRange = copyRange(originalRange);

        expect(copiedRange).not.toBe(originalRange); // Checks that they are different references
        expect(copiedRange.start).not.toBe(originalRange.start);
        expect(copiedRange.end).not.toBe(originalRange.end);
        expect(copiedRange.start.line).toBe(originalRange.start.line);
        expect(copiedRange.start.character).toBe(originalRange.start.character);
        expect(copiedRange.end.line).toBe(originalRange.end.line);
        expect(copiedRange.end.character).toBe(originalRange.end.character);
    });
});
