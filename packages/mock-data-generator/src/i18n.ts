import type { TOptions } from 'i18next';
import i18next from 'i18next';
import translations from './translations/mock-data-generator.i18n.json' with { type: 'json' };

const NS = 'mock-data-generator';

// Bundled translations and `initAsync: false` make `t()` usable on synchronous paths once the module loads.
const i18nInstance = i18next.createInstance({
    resources: {
        en: {
            [NS]: translations
        }
    },
    lng: 'en',
    fallbackLng: 'en',
    defaultNS: NS,
    ns: [NS],
    initAsync: false,
    // Messages are plain text for logs and errors, never HTML: values such as `<request.json>` stay verbatim.
    interpolation: { escapeValue: false }
});

/**
 * Initialize i18next with this package's translations; already done on module load, so repeating it is harmless.
 */
export async function initI18n(): Promise<void> {
    if (!i18nInstance.isInitialized) {
        await i18nInstance.init();
    }
}

/**
 * Helper function facading the call to i18next.
 *
 * @param key i18n key
 * @param options interpolation values and other i18next options
 * @returns {string} localized string stored for the given key
 */
export function t(key: string, options?: TOptions): string {
    return (i18nInstance.t as (key: string, opts?: TOptions) => string)(key, options);
}

// Synchronous init: no top-level await, which would break `require` of this ES module. Without a backend the
// promise cannot reject.
void i18nInstance.init();
