import type { NewI18nEntry } from '../../types';
import { printPropertiesI18nEntry } from '../../utils';
import type { Editor } from 'mem-fs-editor';

/**
 * Write i18n entries to an existing i18n.properties file.
 *
 * @param i18nFilePath i18n file path
 * @param newI18nEntries  new i18n entries that will be maintained
 * @param fs optional `mem-fs-editor` instance. If provided, `mem-fs-editor` api is used instead of `fs` of node
 * @returns boolean
 */
export function writeToExistingI18nPropertiesFile(
    i18nFilePath: string,
    newI18nEntries: NewI18nEntry[],
    fs: Editor
): boolean {
    let newContent = newI18nEntries
        .map((entry) => printPropertiesI18nEntry(entry.key, entry.value, entry.annotation))
        .join('');

    const content = fs.read(i18nFilePath);
    const lines = content.split(/\r\n|\n/);
    // check if file does not end with new line
    if (lines.length > 0 && lines[lines.length - 1].trim()) {
        // If there no end line - add new gap line before new content
        newContent = `\n${newContent}`;
    }
    fs.write(i18nFilePath, content.concat(newContent));
    return true;
}
