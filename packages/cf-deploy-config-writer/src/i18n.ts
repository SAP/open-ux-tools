import type { i18n as i18nNext, TOptions } from 'i18next';
import i18next from 'i18next';
import translations from './translations/cf-deploy-config-writer.i18n.json';

const NS = 'cf-deploy-config-writer';
export const i18n: i18nNext = i18next.createInstance();

/**
 * Initialize i18next with the translations for this module.
 *
 * @returns {Promise<void>} A promise that resolves when i18n is initialized
 */
export async function initI18n(): Promise<void> {
    await i18n.init({
        resources: {
            en: {
                [NS]: translations
            }
        },
        lng: 'en',
        fallbackLng: 'en',
        defaultNS: NS,
        ns: [NS]
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
    return i18n.t(key, options);
}

// Initialize i18n on module load
// Wrapped in async function to satisfy Sonar preference for await over promise chains
// Errors are logged but don't throw to avoid breaking the module (fallback strings will be used)
(async (): Promise<void> => {
    try {
        await initI18n();
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.warn(`[@sap-ux/cf-deploy-config-writer] Failed to initialize i18n: ${errorMessage}`);
    }
})().catch((error: unknown) => {
    // Second-level catch for any errors in the async wrapper itself
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`[@sap-ux/cf-deploy-config-writer] Critical error during i18n initialization: ${errorMessage}`);
});
