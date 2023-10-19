import type { TOptions } from 'i18next';
import i18next from 'i18next';
import translations from '../translations/prompts-common.i18n.json';

export const NS = 'prompts-common';

/**
 * Initialize i18next with the translations for this module.
 */
export async function initI18n(): Promise<void> {
    if (i18next.isInitialized) {
        i18next.addResourceBundle('en', NS, translations);
    } else {
        await i18next.init({
            resources: {
                en: {
                    [NS]: translations
                }
            },
            lng: 'en',
            fallbackLng: 'en',
            ns: [NS]
        });
    }
}

/**
 * Helper function facading the call to i18next. Unless a namespace option is provided the local namespace will be used.
 *
 * @param key i18n key
 * @param options additional options
 * @returns {string} localized string stored for the given key
 */
export function t(key: string, options?: TOptions): string {
    let optionsWithNS = options;
    if (!optionsWithNS?.ns) {
        optionsWithNS = Object.assign(options ? options : {}, { ns: NS });
    }
    return i18next.t(key, optionsWithNS);
}

initI18n().catch(() => {
    // Needed for lint
});
