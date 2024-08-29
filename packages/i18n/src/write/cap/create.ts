import { join } from 'path';
import type { CdsEnvironment, NewI18nEntry } from '../../types';
import { getI18nConfiguration, getCapI18nFolder } from '../../utils';
import { tryAddJsonTexts } from './json';
import { tryAddCsvTexts } from './csv';
import { tryAddPropertiesTexts } from './properties';
import type { Editor } from 'mem-fs-editor';

/**
 * Create new i18n entries to an existing file or in a new file if one does not exist.
 *
 * @param root project root, where i18n folder should reside if no i18n file exists
 * @param path Relative path to cds file for which translation should be maintained
 * @param newI18nEntries new i18n entries that will be maintained
 * @param env CDS environment configuration
 * @param fs optional `mem-fs-editor` instance. If provided, `mem-fs-editor` api is used instead of `fs` of node
 * @returns boolean or exception
 * @description To create new entries, if tries:
 * ```markdown
 * 1. `.json` file
 * 2. `.properties` file, if failed for `.json` file
 * 3. `.csv` file if failed for `.properties` file
 * ```
 */
export async function createCapI18nEntries(
    root: string,
    path: string,
    newI18nEntries: NewI18nEntry[],
    env: CdsEnvironment,
    fs?: Editor
): Promise<boolean> {
    const { baseFileName } = getI18nConfiguration(env);
    const i18nFolderPath = await getCapI18nFolder(root, path, env, fs);
    const filePath = join(i18nFolderPath, baseFileName);

    const updaters = [tryAddJsonTexts, tryAddPropertiesTexts, tryAddCsvTexts];

    for (const update of updaters) {
        const completed = await update(env, filePath, newI18nEntries, fs);
        if (completed) {
            return true;
        }
    }
    return false;
}
