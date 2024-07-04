import type { TOptions } from 'i18next';
import i18next from 'i18next';
import translations from './translations/odata-service-inquirer.i18n.json';
import type { OdataVersion } from '@sap-ux/odata-service-writer';

const odataServiceInquirerNamespace = 'odata-service-inquirer';
export const defaultProjectNumber = 1;
/**
 * Initialize i18next with the translations for this module.
 */
export async function initI18nOdataServiceInquirer(): Promise<void> {
    await i18next.init(
        {
            lng: 'en',
            fallbackLng: 'en',
            missingInterpolationHandler: () => '',
            interpolation: {
                format: function odataVersionFormatter(odataVersion: OdataVersion) {
                    return odataVersion ? ` V${odataVersion}` : '';
                }
            }
        },
        () => i18next.addResourceBundle('en', odataServiceInquirerNamespace, translations)
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
        options = Object.assign(options ?? {}, { ns: odataServiceInquirerNamespace });
    }
    return i18next.t(key, options);
}

initI18nOdataServiceInquirer().catch(() => {
    // Needed for lint
});
