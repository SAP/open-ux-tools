import type { I18nBundle } from '../../types';
import { propertiesToI18nEntry } from '../../transformer/properties';
import type { Editor } from 'mem-fs-editor';
import { readFile } from '../../utils';

/**
 * Gets i18n bundle for `.properties` file.
 *
 * @param i18nFilePath absolute path to `i18n.properties` file
 * @param fs optional `mem-fs-editor` instance. If provided, `mem-fs-editor` api is used instead of `fs` of node
 * @returns i18n bundle or exception
 */
export async function getPropertiesI18nBundle(i18nFilePath: string, fs?: Editor): Promise<I18nBundle> {
    const bundle: I18nBundle = {};
    const content = await readFile(i18nFilePath, fs);
    const ast = propertiesToI18nEntry(content, i18nFilePath);
    for (const entry of ast) {
        if (!bundle[entry.key.value]) {
            bundle[entry.key.value] = [];
        }
        bundle[entry.key.value].push(entry);
    }

    return bundle;
}
