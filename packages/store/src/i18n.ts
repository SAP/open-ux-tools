import type { TOptions, TOptionsBase, i18n } from 'i18next';
import i18next from 'i18next';
import translations from './translations/ux-store.i18n.json';

const NS = 'ux-store';
let i18nInstance: i18n = i18next.createInstance();

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
        fallbackNS: 'default',
        ns: [NS],
        interpolation: { escapeValue: false }
    });
    await i18nInstance.init();
}

type StringMap = { [key: string]: unknown };
export function text(key: string, options?: string | TOptions<StringMap & TOptionsBase>): string {
    return i18nInstance.t(key, typeof options === 'string' ? { defaultValue: options } : options);
}
