import type { TOptions } from 'i18next';
import i18next from 'i18next';
import translations from './translations/inquirer-common.i18n.json';

const inquirerCommonI18nNamespace = 'inquirer-common';

/**
 * Adds the `inquirer-common` resource bundle to i18next.
 * May be required to load i18n translations after initialising in the consumer module.
 */
export function addi18nResourceBundle(): void {
    i18next.addResourceBundle('en', inquirerCommonI18nNamespace, translations);
}

/**
 * Initialize i18next with the translations for this module.
 */
export async function initI18nInquirerCommon(): Promise<void> {
    await i18next.init({ lng: 'en', fallbackLng: 'en' }, () => addi18nResourceBundle());
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
        options = Object.assign(options ?? {}, { ns: inquirerCommonI18nNamespace });
    }
    return i18next.t(key, options);
}

initI18nInquirerCommon().catch(() => {
    // Needed for lint
});
