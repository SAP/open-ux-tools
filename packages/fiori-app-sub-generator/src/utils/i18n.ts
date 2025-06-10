import type { OdataVersion } from '@sap-ux/fiori-elements-writer';
import i18next from 'i18next';
import type { i18n as i18nNext, TOptions } from 'i18next';
import i18ntranslations from '../translations/fioriAppSubGenerator.i18n.json';
export const i18n: i18nNext = i18next.createInstance();

export const fioriAppSubGeneratorNs = 'fiori-app-sub-generator';
export const defaultProjectNumber = 1;

/**
 * Initialize i18next with the translations for this module.
 */
export async function initI18nFioriAppSubGenerator(): Promise<void> {
    await i18n.init({
        resources: {
            en: {
                [fioriAppSubGeneratorNs]: i18ntranslations
            }
        },
        lng: 'en',
        fallbackLng: 'en',
        defaultNS: fioriAppSubGeneratorNs,
        ns: [fioriAppSubGeneratorNs],
        interpolation: {
            format: function odataVersionFormatter(odataVersion: OdataVersion) {
                return odataVersion ? ` V${odataVersion}` : '';
            },
            defaultVariables: {
                defaultProjectNumber
            }
        },
        missingInterpolationHandler: () => '' // Called when interpolation values are undefined, prevents outputting of `{{undefinedProperty}}`
    });
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
        options = Object.assign(options ?? {}, { ns: fioriAppSubGeneratorNs });
    }
    return i18n.t(key, options);
}

initI18nFioriAppSubGenerator().catch(() => {
    // Needed for lint
});
