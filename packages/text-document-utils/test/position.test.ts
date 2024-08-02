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
import { Position, Range } from 'vscode-languageserver-types';

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
        const range = Range.create(Position.create(2, 33), Position.create(2, 59));
        const position = Position.create(9, 33);
        const result = positionContained(range, position);
        expect(result).toMatchInlineSnapshot(`false`);
    });

    it('positionContainedStrict', () => {
        const range = Range.create(Position.create(2, 33), Position.create(2, 59));
        const position = Position.create(9, 33);
        const result = positionContainedStrict(range, position);
        expect(result).toMatchInlineSnapshot(`false`);
    });

    it('rangeContained', () => {
        const rangeA = Range.create(Position.create(2, 33), Position.create(2, 59));
        const rangeB = Range.create(Position.create(4, 33), Position.create(4, 59));
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
    test('should return position at the start for negative offset', () => {
        const result = positionAt([0, 10, 20], -5, 30);
        const expected = Position.create(0, 0); // Line 0, character 0
        expect(result).toEqual(expected);
    });

    test('should return position at the end for offset greater than text length', () => {
        const result = positionAt([0, 10, 20], 35, 30);
        const expected = Position.create(2, 10); // Line 2, character 10
        expect(result).toEqual(expected);
    });

    test('should return correct position for offset within range', () => {
        const result = positionAt([0, 10, 20], 15, 30);
        const expected = Position.create(1, 5); // Line 1, character 5
        expect(result).toEqual(expected);
    });

    test('should handle empty lineOffsets array', () => {
        const result = positionAt([], 5, 10);
        const expected = Position.create(0, 5); // Line 0, character 5
        expect(result).toEqual(expected);
    });

    test('should handle offset at exact line start', () => {
        const result = positionAt([0, 10, 20], 10, 30);
        const expected = Position.create(1, 0); // Line 1, character 0
        expect(result).toEqual(expected);
    });

    test('should handle offset at exact line end', () => {
        const result = positionAt([0, 10, 20], 9, 30);
        const expected = Position.create(0, 9); // Line 0, character 9
        expect(result).toEqual(expected);
    });

    test('should handle offset at exact text length', () => {
        const result = positionAt([0, 10, 20], 30, 30);
        const expected = Position.create(2, 10); // Line 2, character 10
        expect(result).toEqual(expected);
    });
});
