import { type I18nBundle } from '../../types';
import { promises } from 'fs';
import { propertiesToI18nEntry } from '../../transformer/properties';

/**
 * Gets i18n bundle for `.properties` file
 * @param i18nFilePath absolute path to `i18n.properties` file
 * @returns i18n bundle or exception
 */
export async function getPropertiesI18nBundle(i18nFilePath: string): Promise<I18nBundle> {
    const bundle: I18nBundle = {};
    const content = await promises.readFile(i18nFilePath, { encoding: 'utf-8' });
    const ast = propertiesToI18nEntry(content, i18nFilePath);
    for (const entry of ast) {
        if (!bundle[entry.key.value]) {
            bundle[entry.key.value] = [];
        }
        bundle[entry.key.value].push(entry);
    }

    return bundle;
}
