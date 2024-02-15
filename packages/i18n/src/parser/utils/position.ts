import { Position } from './language-server';

/**
 * Position at.
 *
 * @param lineOffsets Array of indices with line start offsets.
 * e.g [0] represents a document with one line that starts at offset 0.
 * @param offset offset
 * @param textLength max length
 * @returns position
 */
export function positionAt(lineOffsets: number[], offset: number, textLength: number): Position {
    const target = Math.max(Math.min(offset, textLength), 0);
    let low = 0;
    let high = lineOffsets.length;

    if (high === 0) {
        return Position.create(0, target);
    }

    while (low < high) {
        const mid = Math.floor((low + high) / 2);
        if (lineOffsets[mid] > target) {
            high = mid;
        } else {
            low = mid + 1;
        }
    }
    const line = low - 1;
    return Position.create(line, target - lineOffsets[line]);
}
