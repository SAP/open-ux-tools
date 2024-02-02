import type { TOptions } from 'i18next';
import i18next from 'i18next';
import translations from './translations/ui5-application-inquirer.i18n.json';

const ui5LibI18nNamespace = 'ui5-application-inquirer';
export const defaultProjectNumber = 1;
/**
 * Initialize i18next with the translations for this module.
 */
export async function initI18n(): Promise<void> {
    await i18next.init({
        resources: {
            en: {
                [ui5LibI18nNamespace]: translations
            }
        },
        lng: 'en',
        fallbackLng: 'en',
        defaultNS: ui5LibI18nNamespace,
        ns: [ui5LibI18nNamespace],
        interpolation: {
            defaultVariables: {
                defaultProjectNumber
            }
        }
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
        options = Object.assign(options ?? {}, { ns: ui5LibI18nNamespace });
    }
    return i18next.t(key, options);
}

initI18n().catch(() => {
    // Needed for lint
});
