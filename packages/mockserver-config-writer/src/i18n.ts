import type { i18n, TOptions } from 'i18next';
import i18next from 'i18next';
import translations from './translations/mockserver-config-writer.i18n.json';

const NS = 'mockserver-config-writer';
let i18nInstance: i18n;

/**
 * Initialize i18next with the translations for this module.
 */
export async function initI18n(): Promise<void> {
    i18nInstance = i18next.createInstance({
        resources: {
            en: {
                [NS]: translations
            }
        },
        lng: 'en',
        fallbackLng: 'en',
        defaultNS: NS,
        ns: [NS]
    });
    await i18nInstance.init();
}

/**
 * Helper function facading the call to i18next.
 *
 * @param key i18n key
 * @param options additional options
 * @returns {string} localized string stored for the given key
 */
export function t(key: string, options?: TOptions): string {
    return i18nInstance.t(key, options);
}

initI18n().catch(() => {
    // Ignore any errors since the write will still work
});
