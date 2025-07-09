import i18next from 'i18next';
import type { i18n as i18nNext, TOptions } from 'i18next';

import translations from './translations/project-input-validator.i18n.json';

export const PROJECT_INPUT_VALIDATOR_NS = 'project-input-validator';
export const i18n: i18nNext = i18next.createInstance();

/**
 * Adds the `project-input-validator` resource bundle to i18next.
 * May be required to load i18n translations after initialising in the consumer module.
 */
export function addi18nResourceBundle(): void {
    i18n.addResourceBundle('en', PROJECT_INPUT_VALIDATOR_NS, translations);
}

/**
 * Initialize i18next with the translations for this module.
 */
export async function initI18nProjectValidators(): Promise<void> {
    await i18n.init({
        lng: 'en',
        fallbackLng: 'en'
    });
    addi18nResourceBundle();
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
    return i18n.t(key, options);
}

initI18nProjectValidators().catch(() => {
    // needed by lint
});
