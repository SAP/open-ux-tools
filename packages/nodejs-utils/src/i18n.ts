import type { i18n as i18nNext, TOptions } from 'i18next';
import i18next from 'i18next';
import translations from './translations/nodejs-utils.i18n.json' with { type: 'json' };

const nodejsUtilsNamespace = 'nodejs-utils';
export const i18n: i18nNext = i18next.createInstance();

/**
 * Initialize i18next with the translations for this module.
 */
export async function initI18nNodejsUtils(): Promise<void> {
    await i18n.init({
        lng: 'en',
        fallbackLng: 'en',
        defaultNS: nodejsUtilsNamespace,
        ns: [nodejsUtilsNamespace],
        resources: {
            en: {
                [nodejsUtilsNamespace]: translations
            }
        },
        interpolation: { escapeValue: false },
        showSupportNotice: false
    });
}

/**
 * Helper function facading the call to i18next. Unless a namespace option is provided the local namespace will be used.
 *
 * @param key i18n key
 * @param options additional options
 * @returns localized string stored for the given key
 */
export function t(key: string, options?: TOptions): string {
    if (!options?.ns) {
        options = Object.assign(options ?? {}, { ns: nodejsUtilsNamespace });
    }
    return (i18n.t as (key: string, opts?: TOptions) => string)(key, options);
}

initI18nNodejsUtils().catch(() => {
    // Needed for lint
});
