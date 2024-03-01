import type { I18nBundle } from '../../types';
import { propertiesToI18nEntry } from '../../transformer/properties';
import { create, type Editor } from 'mem-fs-editor';
import { create as createStore } from 'mem-fs';

/**
 * Gets i18n bundle for `.properties` file.
 *
 * @param i18nFilePath absolute path to `i18n.properties` file
 * @param fs optional `mem-fs-editor` instance. If provided, `mem-fs-editor` api is used instead of `fs` of node
 * @returns i18n bundle or exception
 */
export function getPropertiesI18nBundle(i18nFilePath: string, fs?: Editor): I18nBundle {
    fs ??= create(createStore());
    const bundle: I18nBundle = {};
    const content = fs.read(i18nFilePath);
    const ast = propertiesToI18nEntry(content, i18nFilePath);
    for (const entry of ast) {
        if (!bundle[entry.key.value]) {
            bundle[entry.key.value] = [];
        }
        bundle[entry.key.value].push(entry);
    }

    return bundle;
}
