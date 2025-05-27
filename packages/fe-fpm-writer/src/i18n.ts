import type { TOptions, TOptionsBase } from 'i18next';
import i18next from 'i18next';
import translations from './prompts/translations/i18n';
const namespacePrefix = 'fe-fpm-writer';

export const i18nNamespaces = {
    buildingBlock: `${namespacePrefix}-building-block`
} as const;

/**
 * Initialize i18next with the translations for this module.
 */
export async function initI18n(): Promise<void> {
    await i18next.init({
        resources: {
            en: {
                [i18nNamespaces.buildingBlock]: translations
            }
        },
        lng: 'en',
        fallbackLng: 'en',
        defaultNS: i18nNamespaces.buildingBlock,
        ns: [i18nNamespaces.buildingBlock]
    });
}

type $Dictionary<T = unknown> = { [key: string]: T };

/**
 * Wraps the i18next module's translate function to bind the provided namespace and a key prefix.
 *
 * @param {string} namespace - the translation namespace
 * @param {string} keyPrefix - the key prefix
 * @returns {Function} the translate function
 */
export function translate(
    namespace: string,
    keyPrefix?: string
): (key: string, options?: string | TOptions<$Dictionary & TOptionsBase>) => string | string[] {
    return (key: string, options?: any): string | string[] => {
        const result = i18next.t(`${namespace}:${keyPrefix ?? ''}${key}`, options) as string | string[];
        return result;
    };
}
