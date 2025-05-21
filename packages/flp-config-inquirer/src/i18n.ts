import i18next from 'i18next';
import type { TOptions } from 'i18next';
import { addi18nResourceBundle as addProjectInputI18nResourceBundle } from '@sap-ux/project-input-validator';

import translations from './translations/flp-config-inquirer.i18n.json';

export const FLP_CONFIG_NAMESPACE = 'flp-config-inquirer';

/**
 * Adds the `flp-config-inquirer` resource bundle to i18next.
 * May be required to load i18n translations after initialising in the consumer module.
 */
export function addi18nResourceBundle(): void {
    i18next.addResourceBundle('en', FLP_CONFIG_NAMESPACE, translations);
}

/**
 * Initialize i18next with the translations for this module.
 */
export async function initI18n(): Promise<void> {
    await i18next.init({ lng: 'en', fallbackLng: 'en' });
    addi18nResourceBundle();
    // add the project-input-validator i18n resource bundle to ensure all translations are available
    addProjectInputI18nResourceBundle();
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
        options = Object.assign(options ?? {}, { ns: FLP_CONFIG_NAMESPACE });
    }
    return i18next.t(key, options);
}

initI18n().catch(() => {
    // Needed for lint
});
