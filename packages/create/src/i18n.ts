import type { TOptions, TOptionsBase, i18n } from 'i18next';
import i18next from 'i18next';
import translations from './translations/ux-create.i18n.json' with { type: 'json' };

const NS = 'ux-create';
let i18nInstance: i18n = i18next.createInstance();

/**
 * Initialize i18next for @sap-ux/create
 */
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

/**
 * Get translated text for a given key.
 *
 * @param key - Translation key (e.g., 'systemLookup.multipleSystemsFound')
 * @param options - Interpolation options or default value
 * @returns Translated text
 */
export function text(key: string, options?: string | TOptions<StringMap & TOptionsBase>): string {
    return (i18nInstance.t as (key: string, opts?: TOptions<StringMap & TOptionsBase>) => string)(
        key,
        typeof options === 'string' ? { defaultValue: options } : options
    );
}
