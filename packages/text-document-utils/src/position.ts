import type { Range } from 'vscode-languageserver-types';
import { Position } from 'vscode-languageserver-types';

/**
 *
 * @param lineOffsets Array of indices with line start offsets.
 * e.g [0] represents a document with one line that starts at offset 0.
 * @param offset
 * @param textLength
 * @returns
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
 * Checks if position1 is before position2.
 *
 * @param pos1 position1
 * @param pos2 position2
 * @param includeEqual when positions are equal - if true then result is true, otherwise false
 * @returns boolean result
 */
export function isBefore(pos1: Position, pos2: Position, includeEqual = false): boolean {
    if (pos1.line < pos2.line) {
        return true;
    }
    if (pos1.line > pos2.line) {
        return false;
    }
    if (includeEqual) {
        return pos1.character <= pos2.character;
    }

    return pos1.character < pos2.character;
}

/**
 * Checks if position is contained in range.
 *
 * @param range range
 * @param position position
 * @returns boolean result
 */
export function positionContained(range: Range | undefined, position: Position): range is Range {
    return range !== undefined && !isBefore(position, range.start, false) && isBefore(position, range.end, true);
}

/**
 * Checks if position is contained in range (range must be defined).
 *
 * @param range range
 * @param position position
 * @returns boolean result
 */
export function positionContainedStrict(range: Range, position: Position): boolean {
    return !isBefore(position, range.start, false) && isBefore(position, range.end, true);
}

/**
 * Check if the second range is within the first.
 *
 * @param a first range
 * @param b second range
 * @returns booelan result
 */
export function rangeContained(a: Range, b: Range): boolean {
    return isBefore(a.start, b.start, true) && isBefore(b.end, a.end, true);
}

/**
 * Get indent level based on the start position and tab width.
 *
 * @param startPosition
 * @param tabWidth
 * @returns numeric indent level
 */
export function getIndentLevel(startPosition: number, tabWidth: number): number {
    let level: number;
    if (startPosition < 0) {
        level = -1;
    } else {
        level = startPosition / tabWidth;
    }
    return level;
}

/**
 * Indents based on tabs or tab width.
 *
 * @param tabWidth
 * @param useTabs
 * @param level
 * @returns intentation string
 */
export function indent(tabWidth: number, useTabs: boolean, level: number): string {
    if (useTabs) {
        return '\t'.repeat(level);
    } else {
        return ' '.repeat(tabWidth * level);
    }
}
