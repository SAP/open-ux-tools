import {
    isBefore,
    positionContained,
    rangeContained,
    getIndentLevel,
    positionContainedStrict,
    indent,
    positionAt
} from '../src/position';
import { printOptions } from '../src/text-formatting';
import { Position } from 'vscode-languageserver-types';

// Mocking Position.create
jest.mock('vscode-languageserver-types', () => ({
    Position: {
        create: jest.fn((line, character) => ({ line, character }))
    }
}));

const mockPositionCreate = Position.create as jest.Mock;

describe('position.ts', () => {
    describe('isBefore', () => {
        it('pos1.line < pos2.line', () => {
            const pos1 = Position.create(10, 40);
            const pos2 = Position.create(20, 55);

            const result = isBefore(pos1, pos2);

            expect(result).toBeTruthy();
        });

        it('pos1.line < pos2.line', () => {
            const pos1 = Position.create(20, 40);
            const pos2 = Position.create(10, 55);

            const result = isBefore(pos1, pos2);

            expect(result).toBeFalsy();
        });

        it('includeEqual & pos1.line === pos2.line', () => {
            const pos1 = Position.create(10, 40);
            const pos2 = Position.create(10, 55);

            const result = isBefore(pos1, pos2, true);

            expect(result).toBeTruthy();
        });

        it('!includeEqual & pos1.line === pos2.line', () => {
            const pos1 = Position.create(10, 40);
            const pos2 = Position.create(10, 55);

            const result = isBefore(pos1, pos2, false);

            expect(result).toBeTruthy();
        });
    });

    it('positionContained', () => {
        const range = { start: { line: 2, character: 33 }, end: { line: 2, character: 59 } };
        const position = { line: 9, character: 33 };
        const result = positionContained(range, position);
        expect(result).toMatchInlineSnapshot(`false`);
    });

    it('positionContainedStrict', () => {
        const range = { start: { line: 2, character: 33 }, end: { line: 2, character: 59 } };
        const position = { line: 9, character: 33 };
        const result = positionContainedStrict(range, position);
        expect(result).toMatchInlineSnapshot(`false`);
    });

    it('rangeContained', () => {
        const rangeA = { start: { line: 2, character: 33 }, end: { line: 2, character: 59 } };
        const rangeB = { start: { line: 4, character: 33 }, end: { line: 4, character: 59 } };
        const result = rangeContained(rangeA, rangeB);
        expect(result).toMatchInlineSnapshot(`false`);
    });

    test('getIndentLevel', () => {
        // Arrange
        const startingPosition = 12;

        // Act
        const result = getIndentLevel(startingPosition, printOptions.tabWidth);

        // Expect
        expect(result).toEqual(3);
    });

    test('getIndentLevel with negative start position', () => {
        // Arrange
        const startingPosition = -5;

        // Act
        const result = getIndentLevel(startingPosition, printOptions.tabWidth);

        // Expect
        expect(result).toEqual(-1);
    });

    test('indent with tabs', () => {
        const result = indent(4, true, 2);
        expect(result).toBe('\t'.repeat(2));
    });

    test('indent with spaces', () => {
        const result = indent(4, false, 2);
        expect(result).toMatchInlineSnapshot(`"        "`);
    });
});

describe('positionAt', () => {
    beforeEach(() => {
        jest.restoreAllMocks();
    });

    test('should return position at the start for negative offset', () => {
        positionAt([0, 10, 20], -5, 30);
        expect(mockPositionCreate).toHaveBeenCalledWith(0, 0);
    });

    test('should return position at the end for offset greater than text length', () => {
        positionAt([0, 10, 20], 35, 30);
        expect(mockPositionCreate).toHaveBeenCalledWith(2, 10);
    });

    test('should return correct position for offset within range', () => {
        positionAt([0, 10, 20], 15, 30);
        expect(mockPositionCreate).toHaveBeenCalledWith(1, 5);
    });

    test('should handle empty lineOffsets array', () => {
        positionAt([], 5, 10);
        expect(mockPositionCreate).toHaveBeenCalledWith(0, 5);
    });

    test('should handle offset at exact line start', () => {
        positionAt([0, 10, 20], 10, 30);
        expect(mockPositionCreate).toHaveBeenCalledWith(1, 0);
    });

    test('should handle offset at exact line end', () => {
        positionAt([0, 10, 20], 9, 30);
        expect(mockPositionCreate).toHaveBeenCalledWith(0, 9);
    });

    test('should handle offset at exact text length', () => {
        positionAt([0, 10, 20], 30, 30);
        expect(mockPositionCreate).toHaveBeenCalledWith(2, 10);
    });
});
