import { join } from 'path';
import type { CdsEnvironment, NewI18nEntry } from '../../types';
import { getI18nConfiguration, getCapI18nFolder, printPropertiesI18nEntry, capPropertiesPath } from '../../utils';
import { writeToExistingI18nPropertiesFile } from '../utils';
import { tryAddJsonTexts } from './json';
import { tryAddCsvTexts } from './csv';
import type { Editor } from 'mem-fs-editor';

/**
 * Add i18n entries to respective i18n file.
 *
 * @description It first tries to add to an existing `.properties` file, it it does not exist, it tries to add to `.csv` file,
 * if it fails, it generates new `.properties` file with new i18n entries.
 * @param env cds environment
 * @param path file path
 * @param newI18nEntries new i18n entries that will be maintained
 * @param fs `mem-fs-editor` instance. If provided, `mem-fs-editor` api is used instead of `fs` of node
 * @returns boolean
 */
function tryAddPropertiesTexts(env: CdsEnvironment, path: string, newI18nEntries: NewI18nEntry[], fs: Editor): boolean {
    const newContent = newI18nEntries
        .map((entry) => printPropertiesI18nEntry(entry.key, entry.value, entry.annotation))
        .join('');

    const i18nFilePath = capPropertiesPath(path, env);
    if (!fs.exists(i18nFilePath)) {
        // if `.properties` file does not exit, try csv
        const completed = tryAddCsvTexts(env, path, newI18nEntries, fs);
        if (completed) {
            return true;
        }
        //  create a `.properties` file with new content
        fs.write(i18nFilePath, newContent);
        return true;
    }

    // add to existing `.properties` file
    return writeToExistingI18nPropertiesFile(i18nFilePath, newI18nEntries, fs);
}

/**
 * Create new i18n entries to an existing file or in a new file if one does not exist.
 *
 * @param root project root, where i18n folder should reside if no i18n file exists
 * @param path path to cds file for which translation should be maintained
 * @param newI18nEntries new i18n entries that will be maintained
 * @param env CDS environment configuration
 * @param fs `mem-fs-editor` instance. If provided, `mem-fs-editor` api is used instead of `fs` of node
 * @returns boolean or exception
 * @description To create new entries, if tries:
 * ```markdown
 * 1. `.json` file
 * 2. `.properties` file, if failed for `.json` file
 * 3. `.csv` file if failed for `.properties` file
 * ```
 */
export function createCapI18nEntries(
    root: string,
    path: string,
    newI18nEntries: NewI18nEntry[],
    env: CdsEnvironment,
    fs: Editor
): boolean {
    const { baseFileName } = getI18nConfiguration(env);
    const i18nFolderPath = getCapI18nFolder(root, path, env);
    const filePath = join(i18nFolderPath, baseFileName);

    const updaters = [tryAddJsonTexts, tryAddPropertiesTexts, tryAddCsvTexts];

    for (const update of updaters) {
        const completed = update(env, filePath, newI18nEntries, fs);
        if (completed) {
            return true;
        }
    }
    return false;
}
