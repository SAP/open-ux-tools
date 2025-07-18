import { Position, Range } from '@sap-ux/text-document-utils';
import { arePositionsEqual, areRangesEqual } from '../../src';

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
