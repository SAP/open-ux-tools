import type { TOptions } from 'i18next';
import i18next from 'i18next';
import translations from './translations/mock-data-generator.i18n.json' with { type: 'json' };

const NS = 'mock-data-generator';

// The translations are bundled with the module and initialization is synchronous (`initAsync: false`),
// so `t()` works on synchronous paths, such as request validation, as soon as this module has loaded.
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
 * Initialize i18next with the translations of this package. Initialization already ran when the module
 * loaded; calling it again is harmless.
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

// With `initAsync: false` and inline resources, `init` completes before it returns, so the module is ready once
// loaded and no top-level await holds back importers (or breaks `require` of this ES module). Without a backend
// there is nothing to load, so the returned promise cannot reject.
void i18nInstance.init();
