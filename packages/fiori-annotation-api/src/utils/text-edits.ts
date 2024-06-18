import type { TextEdit } from '@sap-ux/odata-annotation-core-types';

/**
 *  Compares two text edits based on their ranges.
 *  Can be used in {@link Array.prototype.sort} to sort in ascending order.
 *
 * @param a - First text edit.
 * @param b - Second text edit.
 * @returns A negative number if {@link a} should come before {@link b}; A positive number if {@link b} should come before {@link a};
 * 0 if the text edit ranges are equal.
 */
export function compareTextEdits(a: TextEdit, b: TextEdit): number {
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
