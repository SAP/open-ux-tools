import { Position, Range } from 'vscode-languageserver-types';
import { arePositionsEqual, areRangesEqual, createRange, createRangeWithPosition, rangeAt } from '../src/range';

describe('Range utility functions', () => {
    test('arePositionsEqual', () => {
        const result1 = arePositionsEqual(Position.create(0, 0), Position.create(0, 0));
        const result2 = arePositionsEqual(Position.create(1, 0), Position.create(0, 0));
        const result3 = arePositionsEqual(Position.create(0, 1), Position.create(0, 0));

        expect(result1 && !result2 && !result3).toBe(true);
    });

    test('areRangesEqual', () => {
        const pos1 = Position.create(0, 0);
        const pos2 = Position.create(1, 0);
        const pos3 = Position.create(2, 0);
        const result1 = areRangesEqual(Range.create(pos1, pos2), Range.create(pos1, pos2));
        const result2 = areRangesEqual(Range.create(pos1, pos2), Range.create(pos1, pos3));

        expect(result1 && !result2).toBe(true);
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
