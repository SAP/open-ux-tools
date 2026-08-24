import { addi18nResourceBundle as addInquirerCommonTexts } from '@sap-ux/inquirer-common';
import { addi18nResourceBundle as addProjectInputValidatorTexts } from '@sap-ux/project-input-validator';
import type { i18n as i18nNext, TOptions } from 'i18next';
import i18next from 'i18next';
import translations from './translations/odata-service-inquirer.i18n.json' with { type: 'json' };

const odataServiceInquirerNamespace = 'odata-service-inquirer';
export const defaultProjectNumber = 1;
export const i18n: i18nNext = i18next.createInstance();
/**
 * Initialize i18next with the translations for this module.
 */
export async function initI18nOdataServiceInquirer(): Promise<void> {
    await i18n.init({
        lng: 'en',
        fallbackLng: 'en',
        missingInterpolationHandler: () => '',
        interpolation: { escapeValue: false }
    });
    i18n.services.formatter?.add('odataVersionFormatter', (value: string) => (value ? ` V${value}` : ''));
    i18n.services.formatter?.add('addMsgWithColonFormatter', (value: string) => (value ? `: ${value}` : ''));
    i18n.addResourceBundle('en', odataServiceInquirerNamespace, translations);
    // add other bundles that are used in consumed modules
    addInquirerCommonTexts();
    addProjectInputValidatorTexts();
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
        options = Object.assign(options ?? {}, { ns: odataServiceInquirerNamespace });
    }
    return (i18n.t as (key: string, opts?: TOptions) => string)(key, options);
}

void initI18nOdataServiceInquirer().catch(() => undefined);
