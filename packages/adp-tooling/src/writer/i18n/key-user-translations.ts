import { join } from 'node:path';
import type { Editor } from 'mem-fs-editor';

import { getWebappPath } from '@sap-ux/project-access';
import { createPropertiesI18nEntries } from '@sap-ux/i18n';
import type { NewI18nEntry, SapTextType } from '@sap-ux/i18n';
import type { KeyUserTextTranslations } from '@sap-ux/axios-extension';
/**
 * Old-to-new ISO 639 language code mappings used by UI5 locale resolution.
 * Source: sap/base/i18n/Localization.js M_ISO639_OLD_TO_NEW
 */
const M_ISO639_OLD_TO_NEW: Record<string, string> = {
    'iw': 'he',
    'ji': 'yi'
};

/**
 * ABAP language code to BCP47 locale mappings.
 * Source: sap/base/i18n/Localization.js M_ABAP_LANGUAGE_TO_LOCALE
 */
const M_ABAP_LANGUAGE_TO_LOCALE: Record<string, string> = {
    'ZH': 'zh-Hans',
    'ZF': 'zh-Hant',
    'SH': 'sr-Latn',
    'CT': 'cnr',
    '6N': 'en-GB',
    '1P': 'pt-PT',
    '1X': 'es-MX',
    '3F': 'fr-CA',
    '1Q': 'en-US-x-saptrc',
    '2Q': 'en-US-x-sappsd',
    '3Q': 'en-US-x-saprigi'
};

/**
 * Normalizes a backend language key to the locale suffix used in i18n .properties file names.
 * Applies the same language mapping rules used by UI5 when resolving locales.
 *
 * @param lang - Language key from the backend response (e.g., '', 'en', 'iw', 'ZH', 'pt-BR').
 * @returns The normalized locale suffix for .properties file naming (e.g., '', 'en', 'he', 'zh_Hans', 'pt_BR').
 */
export function normalizeLanguageForI18n(lang: string): string {
    if (!lang) {
        return '';
    }

    // Check ABAP language codes first (uppercase lookup)
    const abapMapped = M_ABAP_LANGUAGE_TO_LOCALE[lang.toUpperCase()];
    const tag = abapMapped ?? lang;

    // Parse BCP47 tag: language[-Script][-Region][-variant][-extension][-privateuse]
    const parts = tag.split(/[-_]/);
    let language = parts[0].toLowerCase();

    // Apply old-to-new ISO 639 mapping
    language = M_ISO639_OLD_TO_NEW[language] ?? language;

    // Collect script and region subtags
    const subtags: string[] = [];
    for (let i = 1; i < parts.length; i++) {
        const p = parts[i];
        if (p.length === 4 && /^[A-Za-z]{4}$/.test(p)) {
            // Script subtag (e.g., Hans, Hant, Latn)
            subtags.push(p[0].toUpperCase() + p.slice(1).toLowerCase());
        } else if (p.length === 2 && /^[A-Za-z]{2}$/.test(p)) {
            // Region subtag (e.g., GB, TW, BR)
            subtags.push(p.toUpperCase());
        }
        // Skip variants, extensions, and private use subtags
    }

    return subtags.length ? `${language}_${subtags.join('_')}` : language;
}

/**
 * Replaces the `value` property of each entry in `content.texts` with an i18n binding expression.
 * The generated key follows the pattern `<fileName>_<textId>`.
 *
 * @param contentTexts - The `texts` object from inside the change content.
 * @param fileName - The file name of the change, used as key prefix.
 * @returns The modified texts object with i18n bindings replacing values.
 */
export function replaceTextsWithI18nBindings(
    contentTexts: Record<string, Record<string, unknown>>,
    fileName: string
): Record<string, Record<string, unknown>> {
    const result: Record<string, Record<string, unknown>> = {};
    for (const textId of Object.keys(contentTexts)) {
        const entry = { ...contentTexts[textId] };
        const generatedKey = `${fileName}_${textId}`;
        entry.value = `{i18n>${generatedKey}}`;
        result[textId] = entry;
    }
    return result;
}

/**
 * Writes translations from the top-level `texts` object of a key-user change
 * into the project's i18n .properties files.
 *
 * @param projectPath - The root path of the project.
 * @param fileName - The file name of the change, used as key prefix.
 * @param topLevelTexts - The top-level `texts` object from the API response entry.
 * @param fs - The `mem-fs-editor` instance used for file operations.
 */
export async function writeKeyUserTranslations(
    projectPath: string,
    fileName: string,
    topLevelTexts: KeyUserTextTranslations,
    fs: Editor
): Promise<void> {
    const webappPath = await getWebappPath(projectPath, fs);

    const entriesByLanguage: Record<string, NewI18nEntry[]> = {};
    for (const textId of Object.keys(topLevelTexts)) {
        const textEntry = topLevelTexts[textId];
        const textType = textEntry.type as SapTextType | undefined;
        const values = textEntry.values;

        if (!values) {
            continue;
        }

        const generatedKey = `${fileName}_${textId}`;

        for (const lang of Object.keys(values)) {
            const normalizedLang = normalizeLanguageForI18n(lang);
            if (!entriesByLanguage[normalizedLang]) {
                entriesByLanguage[normalizedLang] = [];
            }
            const entry: NewI18nEntry = {
                key: generatedKey,
                value: values[lang]
            };
            if (textType) {
                entry.annotation = { textType };
            }
            entriesByLanguage[normalizedLang].push(entry);
        }
    }

    for (const lang of Object.keys(entriesByLanguage)) {
        const propertiesFileName = lang ? `i18n_${lang}.properties` : 'i18n.properties';
        const i18nFilePath = join(webappPath, 'i18n', propertiesFileName);
        await createPropertiesI18nEntries(i18nFilePath, entriesByLanguage[lang], undefined, fs);
    }
}
