import i18next from 'i18next';
import type { TOptions } from 'i18next';
import i18ntranslations from './translations/project-input-validator.i18n.json';

export const PROJECT_INPUT_VALIDATOR_NS = 'project-input-validator';

/**
 * Initialize i18next with the translations for this module.
 */
export async function initI18n(): Promise<void> {
    await i18next.init({
        resources: {
            en: {
                [PROJECT_INPUT_VALIDATOR_NS]: i18ntranslations
            }
        },
        lng: 'en',
        fallbackLng: 'en',
        defaultNS: PROJECT_INPUT_VALIDATOR_NS,
        ns: [PROJECT_INPUT_VALIDATOR_NS]
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
        options = Object.assign(options ?? {}, { ns: PROJECT_INPUT_VALIDATOR_NS });
    }
    return i18next.t(key, options);
}

initI18n().catch(() => {
    // needed by lint
});
