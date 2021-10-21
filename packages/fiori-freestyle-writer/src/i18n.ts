import i18next, { TOptions } from 'i18next';
import translations from './translations/fiori-freestyle-writer.i18n.json';

const NS = 'fiori-freestyle-writer';

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
 * @param key
 * @param options
 * @returns i18next instance
 */
export function t(key: string, options?: TOptions): string {
    return i18next.t(key, options);
}

initI18n();
