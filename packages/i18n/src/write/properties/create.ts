import type { NewI18nEntry } from '../../types';
import { doesExist, writeFile } from '../../utils';
import { writeToExistingI18nPropertiesFile } from '../utils';
import { basename } from 'path';
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
    if (!(await doesExist(i18nFilePath))) {
        let content = '# Resource bundle \n';
        if (root) {
            content = `# This is the resource bundle for ${basename(root)}\n`;
        }
        await writeFile(i18nFilePath, content, fs);
    }
    return await writeToExistingI18nPropertiesFile(i18nFilePath, newI18nEntries, fs);
}
