import {
    isBefore,
    positionContained,
    rangeContained,
    getIndentLevel,
    positionContainedStrict,
    indent
} from '@sap-ux/text-document-utils';
import { Position, printOptions } from '@sap-ux/odata-annotation-core-types';

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
