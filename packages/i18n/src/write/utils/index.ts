import type { NewI18nEntry } from '../../types';
import { printPropertiesI18nEntry, readFile, writeFile } from '../../utils';
import type { Editor } from 'mem-fs-editor';
import { Range, TextEdit } from '@sap-ux/text-document-utils';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { parseProperties } from '../../parser/properties/parser';

/**
 * Write i18n entries to an existing i18n.properties file.
 * If keys to remove are provided, they will be removed from the file before writing new entries.
 *
 * @param i18nFilePath i18n file path
 * @param newI18nEntries  new i18n entries that will be maintained
 * @param keysToRemove - Array of keys to remove from the file.
 * @param fs optional `mem-fs-editor` instance. If provided, `mem-fs-editor` api is used instead of `fs` of node
 * @returns boolean
 */
export async function writeToExistingI18nPropertiesFile(
    i18nFilePath: string,
    newI18nEntries: NewI18nEntry[],
    keysToRemove: string[] = [],
    fs?: Editor
): Promise<boolean> {
    let newContent = newI18nEntries
        .map((entry) => printPropertiesI18nEntry(entry.key, entry.value, entry.annotation))
        .join('');

    let content = await readFile(i18nFilePath, fs);

    if (keysToRemove.length) {
        content = removeKeysFromI18nPropertiesFile(content, keysToRemove);
    }

    const lines = content.split(/\r\n|\n/);
    // check if file does not end with new line
    if (lines.length > 0 && lines[lines.length - 1].trim()) {
        // If there no end line - add new gap line before new content
        newContent = `\n${newContent}`;
    }
    await writeFile(i18nFilePath, content.concat(newContent), fs);
    return true;
}

/**
 * Removes i18n entries from an existing i18n.properties file.
 *
 * @param content content of the i18n.properties file.
 * @param keysToRemove Array of keys to remove from the file.
 * @returns string
 */
function removeKeysFromI18nPropertiesFile(content: string, keysToRemove: string[]): string {
    const document = TextDocument.create('', '', 0, content);
    const textEdits: TextEdit[] = [];
    const { ast } = parseProperties(content);

    for (let i = 0; i < ast.length; i++) {
        const line = ast[i];
        if (line.type === 'key-element-line' && keysToRemove.findIndex((key) => line.key.value.includes(key)) !== -1) {
            const previousLine = ast[i - 1];
            const start = previousLine.type === 'comment-line' ? previousLine.range.start : line.range.start;
            const end = line.endOfLineToken ? document.positionAt(line.endOfLineToken.end) : line.range.end;
            textEdits.push(TextEdit.del(Range.create(start, end)));
        }
    }
    return TextDocument.applyEdits(document, textEdits).trim();
}
