import type { i18n, StringMap, TOptions, TOptionsBase } from 'i18next';
import i18next from 'i18next';
import FilesystemBackend from 'i18next-fs-backend';
import { join } from 'path';

const i18nInstance: i18n = i18next.createInstance();
const namespacePrefix = 'fe-fpm-writer';

export const i18nNamespaces = {
    buildingBlock: `${namespacePrefix}-building-block`
} as const;

/**
 * Returns the translation file path for the provided language and namespace.
 *
 * @param {string} language the language
 * @param {string} namespace the i18n namespace
 * @returns {string} the translation file path
 */
function getTranslationFilePath(language: string, namespace: string): string {
    if (namespace === i18nNamespaces.buildingBlock) {
        return join(__dirname, `./prompts/translations/i18n.${language}.json`);
    }
    return '';
}

/**
 * Initialize i18next with the translations for this module.
 */
export async function initI18n(): Promise<void> {
    await i18nInstance.use(FilesystemBackend).init({
        initImmediate: false,
        fallbackLng: 'en',
        interpolation: { escapeValue: false },
        ns: [i18nNamespaces.buildingBlock],
        backend: {
            loadPath: getTranslationFilePath
        }
    });
}

/**
 * Wraps the i18next module's translate function to bind the provided namespace and a key prefix.
 *
 * @param {string} namespace - the translation namespace
 * @param {string} keyPrefix - the key prefix
 * @returns {Function} the translate function
 */
export function translate(
    namespace: string,
    keyPrefix?: string
): (key: string, options?: string | TOptions<StringMap & TOptionsBase>) => string {
    return (key: string, options?: any): string =>
        i18nInstance.t(`${namespace}:${keyPrefix ?? ''}${key}`, options) || '';
}
