import type { TOptions } from 'i18next';
import i18next from 'i18next';
import translations from './translations/flp-config-inquirer.i18n.json';
import { addi18nResourceBundle as addInquirerCommoni18nResourceBundle } from '@sap-ux/inquirer-common';

const flpAppInquirerNamespace = 'flp-config-inquirer';
export const defaultProjectNumber = 1;

/**
 * Initialize i18next with the translations for this module.
 */
export async function initI18n(): Promise<void> {
    await i18next.init({
        lng: 'en',
        fallbackLng: 'en',
        interpolation: {
            defaultVariables: {
                defaultProjectNumber
            }
        }
    });
    i18next.addResourceBundle('en', flpAppInquirerNamespace, translations);
    // add the inquirer common i18n resource bundle to ensure all translations are available
    addInquirerCommoni18nResourceBundle();
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
        options = Object.assign(options ?? {}, { ns: flpAppInquirerNamespace });
    }
    return i18next.t(key, options);
}

initI18n().catch(() => {
    // Needed for lint
});
