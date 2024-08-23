import type { TOptions } from 'i18next';
import i18next from 'i18next';
import translations from './translations/adp-tooling.i18n.json';

const adpI18nNamespace = 'adp-tooling';

/**
 * Initialize i18next with the translations for this module.
 *
 * @returns {Promise<void>} A promise that resolves when the i18n initialization is completed.
 */
export async function initI18n(): Promise<void> {
    await i18next.init({
        resources: {
            en: {
                [adpI18nNamespace]: translations
            }
        },
        lng: 'en',
        fallbackLng: 'en',
        defaultNS: adpI18nNamespace,
        ns: [adpI18nNamespace]
    });
}

/**
 * Helper function facading the call to i18next. Unless a namespace option is provided the local namespace will be used.
 *
 * @param {string} key - The i18n key.
 * @param {TOptions} options - Additional options.
 * @returns {string} Localized string stored for the given key.
 */
export function t(key: string, options?: TOptions): string {
    if (!options?.ns) {
        options = Object.assign(options ?? {}, { ns: adpI18nNamespace });
    }
    return i18next.t(key, options);
}

initI18n().catch(() => {
    // Needed for lint
});
