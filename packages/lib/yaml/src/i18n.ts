import i18next, { TOptions, TOptionsBase } from 'i18next';
import FilesystemBackend from 'i18next-fs-backend';
import path from 'path';

const i18nInstance = i18next.createInstance();
export async function initI18n(): Promise<void> {
    await i18nInstance.use(FilesystemBackend).init({
        initImmediate: false,
        fallbackLng: 'en',
        fallbackNS: 'default',
        ns: 'sap-yaml',
        defaultNS: 'sap-yaml',
        backend: {
            loadPath: path.join(__dirname, './translations/{{lng}}.{{ns}}.json')
        }
    });
}

type StringMap = { [key: string]: unknown };

/**
 * Translates the provided key using the i18n instance.
 *
 * @param {string} key - the key to be translated
 * @param {(string | TOptions<StringMap & TOptionsBase>)} [options] - a list of options for translation interpolation
 * @returns {string} the translated string
 */
export function t(key: string, options?: string | TOptions<StringMap & TOptionsBase>): string {
    return i18nInstance.t(key, options);
}
