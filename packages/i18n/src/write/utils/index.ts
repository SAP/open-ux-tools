import { promises } from 'fs';
import type { NewI18nEntry } from '../../types';
import { printPropertiesI18nEntry } from '../../utils';

/**
 * Write i18n entries to an existing i18n.properties file.
 *
 * @param i18nFilePath i18n file path
 * @param newI18nEntries  new i18n entries that will be maintained
 * @returns boolean
 */
export async function writeToExistingI18nPropertiesFile(
    i18nFilePath: string,
    newI18nEntries: NewI18nEntry[]
): Promise<boolean> {
    let newContent = newI18nEntries
        .map((entry) => printPropertiesI18nEntry(entry.key, entry.value, entry.annotation))
        .join('');

    const content = await promises.readFile(i18nFilePath, { encoding: 'utf8' });
    const lines = content.split(/\r\n|\n/);
    // check if file does not end with new line
    if (lines.length > 0 && lines[lines.length - 1].trim()) {
        // If there no end line - add new gap line before new content
        newContent = `\n${newContent}`;
    }
    await promises.writeFile(i18nFilePath, content.concat(newContent), { encoding: 'utf8' });
    return true;
}
