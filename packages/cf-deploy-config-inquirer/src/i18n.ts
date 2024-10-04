import type { TOptions } from 'i18next';
import i18next from 'i18next';
import translations from './translations/cf-deploy-config-inquirer.i18n.json';

const ui5AppInquirerNamespace = 'cf-deploy-config-inquirer';
export const defaultProjectNumber = 1;
/**
 * Initialize i18next with the translations for this module.
 */
export async function initI18nCfDeployConfigInquirer(): Promise<void> {
    await i18next.init(
        {
            lng: 'en',
            fallbackLng: 'en',
            interpolation: {
                defaultVariables: {
                    defaultProjectNumber
                }
            }
        },
        () => i18next.addResourceBundle('en', ui5AppInquirerNamespace, translations)
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
        options = Object.assign(options ?? {}, { ns: ui5AppInquirerNamespace });
    }
    return i18next.t(key, options);
}

initI18nCfDeployConfigInquirer().catch(() => {
    // Needed for lint
});
