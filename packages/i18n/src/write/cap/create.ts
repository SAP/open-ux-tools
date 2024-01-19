import { join } from 'path';
import type { CdsEnvironment, NewI18nEntry } from '../../types';
import { getI18nConfiguration, getCapI18nFolder } from '../../utils';

import { tryAddJsonTexts } from './json';
import { tryAddCsvTexts } from './csv';
import { tryAddPropertiesTexts } from './properties';

/**
 * Create new i18n entries to an existing file or in a new file if one does not exist.
 *
 * @param root project root, where i18n folder should reside if no i18n file exists
 * @param path path to cds file for which translation should be maintained
 * @param newI18nEntries new i18n entries that will be maintained
 * @param env CDS environment configuration
 * @description to create new entries, if tries:
 * 1. `.json` file
 * 2. `.properties` file, if failed for `.json` file
 * 3. `.csv` file if failed for `.properties` file
 */
export const createCapI18nEntry = async (
    root: string,
    path: string,
    newI18nEntries: NewI18nEntry[],
    env: CdsEnvironment
): Promise<boolean | Error> => {
    const { baseFileName } = getI18nConfiguration(env);
    const i18nFolderPath = await getCapI18nFolder(root, path, env);

    const updaters = [tryAddJsonTexts, tryAddPropertiesTexts, tryAddCsvTexts];

    const filePath = join(i18nFolderPath, baseFileName);

    for (const update of updaters) {
        const completed = await update(env, filePath, newI18nEntries);
        if (completed) {
            return true;
        }
    }
    return false;
};
