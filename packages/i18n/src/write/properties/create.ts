import { promises } from 'fs';
import type { NewI18nEntry } from '../../types';
import { doesExist } from '../../utils';
import { writeToExistingI18nPropertiesFile } from '../utils';
import { basename } from 'path';

/**
 * Creates new i18n entries in `i18n.properties` file.
 *
 * @param i18nFilePath absolute path to `i18n.properties` file
 * @param newI18nEntries new i18n entries that will be maintained
 * @returns boolean or exception
 * @note if `i18n.properties` file does not exits, it tries to create
 * @note consumer should maintain respective `manifest.json` entry if needed
 */
export async function createPropertiesI18nEntries(
    i18nFilePath: string,
    newI18nEntries: NewI18nEntry[],
    root?: string
): Promise<boolean> {
    if (!(await doesExist(i18nFilePath))) {
        let content = '# Resource bundle \n';
        if (root) {
            content = `# This is the resource bundle for ${basename(root)}\n`;
        }
        await promises.writeFile(i18nFilePath, content, { encoding: 'utf8' });
    }
    return await writeToExistingI18nPropertiesFile(i18nFilePath, newI18nEntries);
}
