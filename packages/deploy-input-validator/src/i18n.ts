import i18next from 'i18next';
import type { TOptions } from 'i18next';
import i18ntranslations from './translations/common.i18n.json';

export const DEPLOY_INPUT_VALIDATOR_NS = 'deploy-input-validator';

/**
 * Initialize i18next with the translations for this module.
 */
export async function initI18n(): Promise<void> {
    await i18next.init({
        resources: {
            en: {
                [DEPLOY_INPUT_VALIDATOR_NS]: i18ntranslations
            }
        },
        lng: 'en',
        fallbackLng: 'en',
        defaultNS: DEPLOY_INPUT_VALIDATOR_NS,
        ns: [DEPLOY_INPUT_VALIDATOR_NS]
    });
}

/**
 * Helper function facading the call to i18next.
 *
 * @param key i18n key
 * @param options additional options
 * @returns {string} localized string stored for the given key
 */
export function t(key: string, options?: TOptions): string {
    return i18next.t(key, options);
}

initI18n().catch(() => {
    // Ignore any errors since the write will still work
});
