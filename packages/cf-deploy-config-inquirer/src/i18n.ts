import type { i18n as i18nNext, TOptions } from 'i18next';
import i18next from 'i18next';
import translations from './translations/cf-deploy-config-inquirer.i18n.json';

const cfInquirerNamespace = 'cf-deploy-config-inquirer';
export const defaultProjectNumber = 1;
export const i18n: i18nNext = i18next.createInstance();
/**
 * Initialize i18next with the translations for this module.
 */
export async function initI18nCfDeployConfigInquirer(): Promise<void> {
    await i18n.init({
        lng: 'en',
        fallbackLng: 'en',
        interpolation: {
            defaultVariables: {
                defaultProjectNumber
            }
        }
    });

    i18n.addResourceBundle('en', cfInquirerNamespace, translations);
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
        options = Object.assign(options ?? {}, { ns: cfInquirerNamespace });
    }
    return i18n.t(key, options);
}

initI18nCfDeployConfigInquirer().catch(() => {
    // Needed for lint
});
