import { Range, Position } from 'vscode-languageserver-types';

export { Range, Position };

/**
 * Computes line offsets for the given string.
 *
 * @param text text
 * @returns array of number
 */
export function getLineOffsets(text: string): number[] {
    const lineOffsets: number[] = [0];
    for (let index = 0; index < text.length; ) {
        const character = text[index];
        if (character === '\n') {
            lineOffsets.push(index + 1);
            index++; // Increment index here
        } else if (character === '\r') {
            if (index + 1 < text.length && text[index + 1] === '\n') {
                index += 2; // Increment index by 2 when encountering '\r\n'
            } else {
                index++; // Increment index by 1 when encountering '\r'
            }
            lineOffsets.push(index); // Push the updated index value
        } else {
            index++; // Increment index if character is not a line break
        }
    }
    return lineOffsets;
}

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

/**
 * Create range.
 *
 * @param lineOffsets line offset
 * @param start start point
 * @param end end point
 * @param textLength text length
 * @returns range
 */
export function rangeAt(lineOffsets: number[], start: number, end: number, textLength: number): Range {
    return Range.create(positionAt(lineOffsets, start, textLength), positionAt(lineOffsets, end, textLength));
}
