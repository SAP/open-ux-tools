import { Editor } from 'mem-fs-editor';
import os from 'os';
import { join } from 'path';
import { getTemplatePath } from '../templates';
import type { FileContentPosition } from '../common/types';

/**
 * Method inserts passed text into content by char index position.
 * In case if position is out of range, then whitespaces would be created.
 * Negative positions are not supported.
 *
 * @param {string} text - text to insert
 * @param {string} content - target content for update
 * @param {number} position - Char index position to insert in
 * @returns new content with inserted text
 */
export function insertTextAtAbsolutePosition(text: string, content: string, position: number): string {
    if (position < 0) {
        return content;
    }
    // Check if char position exist and create missing chars
    const prepareCharIndex = Math.max(position - 1, 0);
    while (prepareCharIndex > 0 && content[prepareCharIndex] === undefined) {
        content += ' ';
    }
    return `${content.slice(0, position)}${text}${content.slice(position)}`;
}

/**
 * Method inserts passed text into content by line and char position.
 * In case if position is out of range, then whitespaces would be created.
 * Negative positions are not supported.
 *
 * @param {string} text - text to insert
 * @param {string} content - target content for update
 * @param {FileContentPosition} position - Line and char position to insert in
 * @returns new content with inserted text
 */
export function insertTextAtPosition(text: string, content: string, position: FileContentPosition): string {
    if (position.line < 0 || position.character < 0) {
        return content;
    }
    const lines = content.split(/\r\n|\n/);
    let targetLine = lines[position.line];
    // Check if line position exist and create missing lines
    while (targetLine === undefined) {
        lines.push('');
        targetLine = lines[position.line];
    }
    // Update line with inserting passed text
    lines[position.line] = insertTextAtAbsolutePosition(text, lines[position.line], position.character);
    return lines.join(os.EOL);
}

export function addExtensionTypes(basePath: string, fs: Editor) {
    const path = join(basePath, '/webapp/ext/sap.fe.d.ts');
    if (!fs.exists(path)) {
        fs.copy(getTemplatePath('common/sap.fe.d.ts'), path);
    }
}
