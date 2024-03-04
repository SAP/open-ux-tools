import type { CdsEnvironment, CdsI18nConfiguration, CdsI18nEnv } from '../types';

/**
 * Get i18n configuration.
 *
 * @param env cds environment
 * @returns cds i18n configuration
 */
export function getI18nConfiguration(env: CdsEnvironment): CdsI18nConfiguration {
    const {
        default_language: defaultLanguage,
        fallback_bundle: fallbackLanguage,
        file,
        folders
    }: CdsI18nEnv = env?.i18n ?? {};
    return {
        defaultLanguage: defaultLanguage ?? 'en',
        fallbackLanguage: fallbackLanguage ?? '',
        baseFileName: file ?? 'i18n',
        folders: folders ?? ['_i18n', 'i18n']
    };
}

/**
 * Returns a list of allowed i18n folder names, where translation files can be found.
 *
 * @param env cds environment
 * @returns array of folder names
 */
export function getI18nFolderNames(env: CdsEnvironment): string[] {
    const { folders } = getI18nConfiguration(env);
    return folders;
}
