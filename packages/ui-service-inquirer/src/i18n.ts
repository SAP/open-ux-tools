import type { i18n as i18nNext, TOptions } from 'i18next';
import i18next from 'i18next';
import translations from './translations/ui-service-inquirer.i18n.json';

const uiServiceI18nNamespace = 'ui-service-inquirer';
export const i18n: i18nNext = i18next.createInstance();
/**
 * Initialize i18next with the translations for this module.
 */
export async function initI18n(): Promise<void> {
    await i18n.init({
        lng: 'en',
        fallbackLng: 'en'
    });
    i18n.addResourceBundle('en', uiServiceI18nNamespace, translations);
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
        options = Object.assign(options ?? {}, { ns: uiServiceI18nNamespace });
    }
    return i18n.t(key, options);
}

initI18n().catch(() => {
    // Needed for lint
});
