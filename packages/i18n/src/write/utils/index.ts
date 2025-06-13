import type { NewI18nEntry } from '../../types';
import { printPropertiesI18nEntry, readFile, writeFile } from '../../utils';
import type { Editor } from 'mem-fs-editor';

/**
 * Write i18n entries to an existing i18n.properties file.
 *
 * @param i18nFilePath i18n file path
 * @param newI18nEntries  new i18n entries that will be maintained
 * @param fs optional `mem-fs-editor` instance. If provided, `mem-fs-editor` api is used instead of `fs` of node
 * @returns boolean
 */
export async function writeToExistingI18nPropertiesFile(
    i18nFilePath: string,
    newI18nEntries: NewI18nEntry[],
    fs?: Editor
): Promise<boolean> {
    let newContent = newI18nEntries
        .map((entry) => printPropertiesI18nEntry(entry.key, entry.value, entry.annotation))
        .join('');

    const content = await readFile(i18nFilePath, fs);
    if (content) {
        const lines = content.split(/\r\n|\n/);
        // check if file does not end with new line
        if (lines.length > 0 && lines[lines.length - 1].trim()) {
            // If there no end line - add new gap line before new content
            newContent = `\n${newContent}`;
        }
        await writeFile(i18nFilePath, content.concat(newContent), fs);
        return true;
    } else {
        return false;
    }
}

/**
 * Overwrites an existing i18n.properties file by removing specified keys and adding new i18n entries.
 *
 * @param i18nFilePath - The path to the i18n file.
 * @param newI18nEntries - Array of new i18n entries to add.
 * @param keysToRemove - Array of keys to remove from the file.
 * @param fs - Optional mem-fs-editor instance.
 * @returns Promise<void>
 */
export async function replaceI18nProperties(
    i18nFilePath: string,
    newI18nEntries: NewI18nEntry[],
    keysToRemove: string[],
    fs?: Editor
): Promise<void> {
    // Remove lines with keys to remove
    const content = await readFile(i18nFilePath, fs);
    const lines = content ? content.split(/\r\n|\n/) : [];
    const filteredLines: string[] = [];

    for (let i = 0; i < lines.length; ) {
        const trimmed = lines[i].trim();
        // Check if this line is a key to remove
        const matchIdx = keysToRemove.findIndex((key) => trimmed.includes(key));
        if (matchIdx !== -1) {
            // Remove comment/empty lines above
            let j = filteredLines.length - 1;
            while (j >= 0 && (filteredLines[j].trim().startsWith('#') || filteredLines[j].trim() === '')) {
                filteredLines.pop();
                j--;
            }
            // Skip this line (the key) and any empty lines below
            i++;
            while (i < lines.length && lines[i].trim() === '') {
                i++;
            }
        } else {
            filteredLines.push(lines[i]);
            i++;
        }
    }

    // Add new entries
    const newContent = filteredLines
        .map((line) => `${line.trim()}\n`)
        .concat(newI18nEntries.map((entry) => printPropertiesI18nEntry(entry.key, entry.value, entry.annotation)))
        .join('');

    await writeFile(i18nFilePath, newContent.trim(), fs);
}
