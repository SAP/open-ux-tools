import type { i18n as i18nNext, TOptions } from 'i18next';
import i18next from 'i18next';
import translations from '../translations/ui5-lib-generator.i18n.json';

const ui5LibGeneratorNs = 'ui5-lib-generator';
export const i18n: i18nNext = i18next.createInstance();

/**
 * Initialize i18next with the translations for this module.
 */
async function initI18n(): Promise<void> {
    await i18n.init({
        lng: 'en',
        fallbackLng: 'en'
    });
    i18n.addResourceBundle('en', ui5LibGeneratorNs, translations);
}

/**
 * Helper function facading the call to i18next. Unless a namespace option is provided the local namespace will be used.
 *
 * @param key i18n key
 * @param options additional options
 * @returns {string} localized string stored for the given key
 */
export function t(key: string, options?: TOptions): string {
    if (!options?.ns) {
        options = Object.assign(options ?? {}, { ns: ui5LibGeneratorNs });
    }
    return i18n.t(key, options);
}

initI18n().catch(() => {
    // Needed for lint
});
