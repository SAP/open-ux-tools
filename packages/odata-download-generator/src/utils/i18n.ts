import i18next from 'i18next';
import type { i18n as i18nNext, TOptions } from 'i18next';
import i18ntranslations from '../translations/odataDownloadGenerator.i18n.json';
export const i18n: i18nNext = i18next.createInstance();

export const odataDownloadGenerator = 'odata-dowload-generator';

/**
 * Initialize i18next with the translations for this module.
 */
export async function initI18nODataDownloadGnerator(): Promise<void> {
    await i18n.init({
        resources: {
            en: {
                [odataDownloadGenerator]: i18ntranslations
            }
        },
        lng: 'en',
        fallbackLng: 'en',
        defaultNS: odataDownloadGenerator,
        ns: [odataDownloadGenerator],
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
        options = Object.assign(options ?? {}, { ns: odataDownloadGenerator });
    }
    return i18n.t(key, options);
}

initI18nODataDownloadGnerator().catch(() => {
    // Needed for lint
});
