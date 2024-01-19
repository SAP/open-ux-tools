import { writeFile } from 'fs/promises';
import type { CdsEnvironment, NewI18nEntry } from '../../types';
import { printPropertiesI18nEntry, capPropertiesPath, doesExist } from '../../utils';
import { tryAddCsvTexts } from './csv';
import { writeToExistingI18nPropertiesFile } from '../utils';

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
        await writeFile(i18nFilePath, newContent, { encoding: 'utf8' });
        return true;
    }

    // add to existing `.properties` file
    return await writeToExistingI18nPropertiesFile(i18nFilePath, newI18nEntries);
}
