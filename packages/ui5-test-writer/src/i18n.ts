import type { TOptions } from 'i18next';
import i18next from 'i18next';
import translations from './translations/ui5-test-writer.i18n.json';

const NS = 'ui5-test-writer';

/**
 * Initialize i18next with the translations for this module.
 */
export async function initI18n(): Promise<void> {
    await i18next.init({
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
}

/**
 * Helper function facading the call to i18next.
 *
 * @param key i18n key
 * @param options additional options
 * @returns {string} localized string stored for the given key
 */
export function t(key: string, options?: TOptions): string {
    return i18next.t(key, options);
}

initI18n();
