import type { i18n, TOptions, TOptionsBase } from 'i18next';
import i18next from 'i18next';
import i18nEn from './i18n/i18n.json' with { type: 'json' };

const NS = 'ux-app-migrator';
const i18nInstance: i18n = i18next.createInstance();

/**
 * Initializes the i18n instance with the specified language.
 *
 * @param language The language to initialize i18n with. Defaults to English ('en').
 */
export async function initI18n(language = 'en'): Promise<void> {
    await i18nInstance.init({
        resources: {
            en: {
                [NS]: i18nEn
            }
        },
        lng: language,
        fallbackLng: 'en',
        defaultNS: NS,
        joinArrays: '\n\n'
    });
}

/**
 * Retrieves a translated string for the given key.
 *
 * @param key The translation key.
 * @param options Either a default string or an options object.
 * @returns The translated string or the key itself if i18n is not initialized.
 */
export function i18nText(key: string, options?: TOptions<{ [key: string]: unknown } & TOptionsBase>): string {
    return i18nInstance.t(key, options);
}
