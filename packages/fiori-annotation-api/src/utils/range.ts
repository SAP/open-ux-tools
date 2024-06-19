import type { Range } from '@sap-ux/odata-annotation-core-types';

/**
 *  Compares two objects based on their ranges.
 *  Can be used in {@link Array.prototype.sort} to sort in ascending order.
 *
 * @param a - First object.
 * @param b - Second object.
 * @returns A negative number if {@link a} should come before {@link b}; A positive number if {@link b} should come before {@link a};
 * 0 if the object ranges are equal.
 */
export function compareByRange<T extends { range?: Range }>(a: T, b: T): number {
    if (!a.range) {
        return 1;
    }
    if (!b.range) {
        return -1;
    }
    const diff = a.range.start.line - b.range.start.line;
    if (diff === 0) {
        const startCharacterDiff = a.range.start.character - b.range.start.character;
        if (startCharacterDiff === 0) {
            const endLineDiff = a.range.end.line - b.range.end.line;
            if (endLineDiff === 0) {
                return a.range.end.character - b.range.end.character;
            }
            return endLineDiff;
        }
        return a.range.start.character - b.range.start.character;
    }
    return diff;
}
