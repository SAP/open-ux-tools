import type { TOptions } from 'i18next';
import i18next from 'i18next';
import translations from '../translations/abap-deploy-config-sub-generator.i18n.json';

const ui5LibGeneratorNs = 'abap-deploy-config-sub-generator';

/**
 * Initialize i18next with the translations for this module.
 */
async function initI18n(): Promise<void> {
    await i18next.init({ lng: 'en', fallbackLng: 'en' }, () =>
        i18next.addResourceBundle('en', ui5LibGeneratorNs, translations)
    );
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
        options = Object.assign(options ?? {}, { ns: ui5LibGeneratorNs });
    }
    return i18next.t(key, options);
}

initI18n().catch(() => {
    // Needed for lint
});
