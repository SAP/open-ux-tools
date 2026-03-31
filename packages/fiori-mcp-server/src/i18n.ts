import type { i18n as i18nNext, TOptions } from 'i18next';
import i18next from 'i18next';
import translations from './translations/fiori-mcp-server.i18n.json';

const NS = 'fiori-mcp-server';
export const i18n: i18nNext = i18next.createInstance();

/**
 * Initialize i18next with the translations for this module.
 */
export async function initI18n(): Promise<void> {
    await i18n.init({
        resources: {
            en: {
                [NS]: translations
            }
        },
        lng: 'en',
        fallbackLng: 'en',
        defaultNS: NS,
        ns: [NS],
        showSupportNotice: false
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
    return (i18n.t as (key: string, opts?: TOptions) => string)(key, options);
}

initI18n().catch(() => {
    // Needed for lint
});
