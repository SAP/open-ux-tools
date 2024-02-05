import { promises } from 'fs';
import type { CdsEnvironment, NewI18nEntry } from '../../types';
import { printPropertiesI18nEntry, capPropertiesPath, doesExist } from '../../utils';
import { tryAddCsvTexts } from './csv';
import { writeToExistingI18nPropertiesFile } from '../utils';

/**
 * Add i18n entries to respective i18n file.
 *
 * @description It first tries to add to an existing `.properties` file, it it does not exist, it tries to add to `.csv` file,
 * if it fails, it generates new `.properties` file with new i18n entries.
 * @param env cds environment
 * @param path file path
 * @param newI18nEntries new i18n entries that will be maintained
 * @returns boolean
 */
export async function tryAddPropertiesTexts(
    env: CdsEnvironment,
    path: string,
    newI18nEntries: NewI18nEntry[]
): Promise<boolean> {
    const newContent = newI18nEntries
        .map((entry) => printPropertiesI18nEntry(entry.key, entry.value, entry.annotation))
        .join('');

    const i18nFilePath = capPropertiesPath(path, env);
    if (!(await doesExist(i18nFilePath))) {
        // if `.properties` file does not exit, try csv
        const completed = await tryAddCsvTexts(env, path, newI18nEntries);
        if (completed) {
            return true;
        }
        //  create a `.properties` file with new content
        await promises.writeFile(i18nFilePath, newContent, { encoding: 'utf8' });
        return true;
    }

    // add to existing `.properties` file
    return await writeToExistingI18nPropertiesFile(i18nFilePath, newI18nEntries);
}
