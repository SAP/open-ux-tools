import i18next from 'i18next';
import type { TOptions } from 'i18next';

import { addi18nResourceBundle as addInquirerCommonResourceBundle } from '@sap-ux/inquirer-common';
import { addi18nResourceBundle as addProjectInputValidatorBundle } from '@sap-ux/project-input-validator';

import translations from '../translations/generator-adp.i18n.json';

const adpGeneratorI18nNamespace = 'generator-adp';

/**
 * Initialize i18next with the translations for this module.
 */
export async function initI18n(): Promise<void> {
    await i18next.init({ lng: 'en', fallbackLng: 'en' }, () =>
        i18next.addResourceBundle('en', adpGeneratorI18nNamespace, translations)
    );

    addInquirerCommonResourceBundle();
    addProjectInputValidatorBundle();
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
        options = Object.assign(options ?? {}, { ns: adpGeneratorI18nNamespace });
    }
    return i18next.t(key, options);
}

initI18n().catch(() => {
    // Needed for lint
});
