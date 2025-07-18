import type { i18n as i18nNext, TOptions } from 'i18next';
import i18next from 'i18next';
import smartLinksRes from './translations/smartlinks-config.json';
import navConfigRes from './translations/navigation-config.json';

export const SMART_LINKS_NS = 'app-config-writer:smartLinksConfig';
export const NAV_CONFIG_NS = 'app-config-writer:navConfig';
export const i18n: i18nNext = i18next.createInstance();

/**
 * Initialize i18next with the translations for this module.
 */
export async function initI18n(): Promise<void> {
    await i18n.init({
        resources: {
            en: {
                [SMART_LINKS_NS]: smartLinksRes,
                [NAV_CONFIG_NS]: navConfigRes
            }
        },
        lng: 'en',
        fallbackLng: 'en',
        defaultNS: SMART_LINKS_NS, // Default since first to add translations
        ns: [SMART_LINKS_NS, NAV_CONFIG_NS]
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
    return i18n.t(key, options);
}

initI18n().catch(() => {
    // Ignore any errors since the write will still work
});
