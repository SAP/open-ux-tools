import { type I18nBundle } from '../../types';
import { readFile } from 'fs/promises';
import { propertiesToI18nEntry } from '../../transformer/properties';

/**
 * Gets i18n bundle for `.properties` file
 * @param i18nFilePath absolute path to `i18n.properties` file
 */
export async function getPropertiesI18nBundle(i18nFilePath: string): Promise<I18nBundle | Error> {
    const bundle: I18nBundle = {};
    const content = await readFile(i18nFilePath, { encoding: 'utf-8' });
    const ast = propertiesToI18nEntry(content, i18nFilePath);
    for (const entry of ast) {
        if (!bundle[entry.key.value]) {
            bundle[entry.key.value] = [];
        }
        bundle[entry.key.value].push(entry);
    }

    return bundle;
}
