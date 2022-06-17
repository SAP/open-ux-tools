import os from 'os';
import type { FileContentPosition } from '../common/types';

/**
 * Method insert passed text into content by line and char position.
 * In case if position is out ofrange, then whitespaces would be created.
 * @param {string} text - text to insert
 * @param {string} content - target content for update
 * @param {FileContentPosition} position - Line and char position to insert in
 * @returns new content with inserted text
 */
export function insertTextAtPosition(text: string, content: string, position: FileContentPosition): string {
    const lines = content.split(/\r\n|\n/);
    let targetLine = lines[position.line];
    // Check if line position exist and create missing lines
    while (targetLine === undefined) {
        lines.push('');
        targetLine = lines[position.line];
    }
    // Check if char position exist and create missing chars
    const prepareCharIndex = Math.max(position.character - 1, 0);
    let targetChar = targetLine[prepareCharIndex];
    while (targetChar === undefined) {
        targetLine += ' ';
        targetChar = targetLine[prepareCharIndex];
    }
    // Update line with inserting passed text
    lines[position.line] = `${targetLine.slice(0, position.character)}${text}${targetLine.slice(position.character)}`;
    return lines.join(os.EOL);
}
