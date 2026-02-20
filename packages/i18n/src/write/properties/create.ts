import type { NewI18nEntry } from '../../types';
import { doesExist, writeFile } from '../../utils';
import { writeToExistingI18nPropertiesFile } from '../utils';
import { basename } from 'node:path';
import type { Editor } from 'mem-fs-editor';

/**
 * Creates new i18n entries in `i18n.properties` file.
 *
 * @param i18nFilePath absolute path to `i18n.properties` file
 * @param newI18nEntries new i18n entries that will be maintained
 * @param root project root optionally used in comment if file is newly generated
 * @param fs optional `mem-fs-editor` instance. If provided, `mem-fs-editor` api is used instead of `fs` of node
 * @returns boolean or exception
 * @description If `i18n.properties` file does not exits, it tries to create.
 * @description Consumer should maintain respective `manifest.json` entry if needed.
 */
export async function createPropertiesI18nEntries(
    i18nFilePath: string,
    newI18nEntries: NewI18nEntry[],
    root?: string,
    fs?: Editor
): Promise<boolean> {
    if ((!fs && !(await doesExist(i18nFilePath))) || (fs && !fs.exists(i18nFilePath))) {
        await createNewI18nFile(i18nFilePath, root, fs);
    }
    return await writeToExistingI18nPropertiesFile(i18nFilePath, newI18nEntries, [], fs);
}

/**
 * Creates or overwrites i18n entries in the `i18n.properties` file.
 *
 * @param i18nFilePath - Absolute path to the `i18n.properties` file.
 * @param newI18nEntries - New i18n entries to be added or updated.
 * @param keysToRemove - Keys to be removed from the properties file.
 * @param root -Project root, optionally used in the comment if the file is newly generated.
 * @param fs - Optional `mem-fs-editor` instance. If provided, its API is used instead of Node's `fs`.
 * @returns Promise that resolves when the operation is complete.
 * @description If `i18n.properties` file does not exits, it tries to create.
 */
export async function removeAndCreateI18nEntries(
    i18nFilePath: string,
    newI18nEntries: NewI18nEntry[],
    keysToRemove: string[] = [],
    root?: string,
    fs?: Editor
): Promise<void> {
    if ((!fs && !(await doesExist(i18nFilePath))) || (fs && !fs.exists(i18nFilePath))) {
        await createNewI18nFile(i18nFilePath, root, fs);
    }
    await writeToExistingI18nPropertiesFile(i18nFilePath, newI18nEntries, keysToRemove, fs);
}

/**
 * Creates a new i18n.properties file with a default or root-specific comment.
 *
 * @param i18nFilePath - Absolute path to the i18n.properties file.
 * @param root - Optional project root, used in the comment if provided.
 * @param fs - Optional mem-fs-editor instance for file operations.
 * @returns A promise that resolves to the written content or void.
 */
async function createNewI18nFile(i18nFilePath: string, root?: string, fs?: Editor): Promise<string | void> {
    let content = '# Resource bundle \n';
    if (root) {
        content = `# This is the resource bundle for ${basename(root)}\n`;
    }
    return writeFile(i18nFilePath, content, fs);
}
