import type { I18nBundle, TranslationEntry } from './UITranslationButton.types';
import { TranslationKeyGenerator, TranslationTextPattern } from './UITranslationButton.types';

/**
 * Method extracts i18n binding and returns key of i18n entry.
 *
 * @param value Binding value.
 * @param patterns Check if method should resolve syntax annotation based i18n binding.
 * @param prefixes Allowed prefixes for single bracket pattern.
 * @returns {string | undefined} I18n entry key or undefined if input does not matches i18n binding pattern.
 */
export const extractI18nKey = (
    value: string,
    patterns: TranslationTextPattern[],
    prefixes: string[]
): string | undefined => {
    let key: string | undefined;
    for (const pattern of patterns) {
        if (pattern === TranslationTextPattern.SingleBracketBinding) {
            for (const prefix of prefixes) {
                const i18nMatch = value.toString().match(`^{${prefix}>([^\\{}:]+)}$`);
                if (i18nMatch?.[1]) {
                    key = i18nMatch?.[1];
                }
            }
        } else if (pattern === TranslationTextPattern.DoubleBracketReplace && value.match(`^{{[^\\{}:]+}}$`)) {
            key = value.toString().substring(2, value.length - 2);
        }
    }
    return key;
};

/**
 * Convert to camel case.
 * It gets input like 'product details info' and convert it to 'productDetailsInfo'.
 *
 * @param input Value to convert.
 * @param maxWord Maximal cxount of words to convert.
 * @returns Canverted value.
 */
export const convertToCamelCase = (input = '', maxWord = 4): string => {
    let output = '';
    const parts = input
        .replace(/[^a-zA-Z0-9 ]/g, '')
        .trim()
        .split(' ');
    const len = parts.length >= maxWord ? maxWord : parts.length;
    for (let i = 0; len > i; i++) {
        const part = parts[i];
        if (i === 0) {
            output += part.toLowerCase();
        } else {
            const initial = part.charAt(0).toUpperCase();
            const rest = part.substr(1).toLowerCase();
            output += `${initial}${rest}`;
        }
    }

    return output;
};
/**
 * Convert to pascal case.
 * It gets input like 'product details info' and convert it to 'ProductDetailsInfo'.
 *
 * @param input Value to convert.
 * @param maxWord Maximal cxount of words to convert.
 * @returns Canverted value.
 */
export const convertToPascalCase = (input: string, maxWord = 4): string => {
    let output = '';
    const parts = input
        .replace(/[^a-zA-Z0-9 ]/g, '')
        .trim()
        .split(' ');
    const len = parts.length >= maxWord ? maxWord : parts.length;
    for (let i = 0; len > i; i++) {
        const part = parts[i];
        const initial = part.charAt(0).toUpperCase();
        const rest = part.substr(1).toLowerCase();
        output += `${initial}${rest}`;
    }

    return output;
};

/**
 * Get unique key.
 * If the key is not unique, it increment key by one and recheck.
 *
 * @param key new key and it is incremented.
 * @param i18nData I18n entries.
 * @param originalKey original key without any index increment.
 * @param counter counter for increment.
 * @returns Generated i18n key.
 */
const getI18nUniqueKey = (key: string, i18nData: I18nBundle, originalKey = key, counter = 1): string => {
    const uniqueKey = key;
    if (i18nData[key] !== undefined) {
        key = `${originalKey}${counter}`;
        counter++;
        return getI18nUniqueKey(key, i18nData, originalKey, counter);
    }
    return uniqueKey;
};

/**
 * Generates a unique i18n key for the text.
 * It considers currently active bundle and translation key generator.
 *
 * @param text
 * @param translationKeyGenerator
 * @param bundle
 * @returns Generated i18n key.
 */
export function generateI18nKey(
    text: string,
    translationKeyGenerator: TranslationKeyGenerator,
    bundle: I18nBundle
): string {
    let key =
        translationKeyGenerator === TranslationKeyGenerator.CamelCase
            ? convertToCamelCase(text)
            : convertToPascalCase(text);
    if (key === '') {
        key = translationKeyGenerator === TranslationKeyGenerator.CamelCase ? 'key' : 'Key';
    }
    return getI18nUniqueKey(key, bundle);
}

/**
 * Method to apply passed pattern for passed key.
 *
 * @param key I18n key.
 * @param pattern I18n pattern.
 * @param prefix Prefix for single bracket pattern.
 * @returns Generated i18n value for passed pattern.
 */
export const applyI18nPattern = (key: string, pattern: TranslationTextPattern, prefix: string): string => {
    return pattern === TranslationTextPattern.DoubleBracketReplace ? `{{${key}}}` : `{${prefix}>${key}}`;
};

/**
 * Method finds first existing i18n key searching by key.
 *
 * @param {I18nBundle} bundle Search for value.
 * @param {string} key Search for key.
 * @returns {TranslationEntry | undefined} Key if value is found.
 */
export const getTranslationByKey = (bundle: I18nBundle, key: string): TranslationEntry | undefined => {
    const entries = bundle[key];
    if (entries?.length > 0) {
        return entries[0];
    }
    return undefined;
};

/**
 * Method finds existing i18n key searching by value.
 *
 * @param {I18nBundle} bundle Search for value.
 * @param {string} value Search for value.
 * @returns {TranslationEntry | undefined} Key if value is found.
 */
export const getTranslationByText = (bundle: I18nBundle, value: string): TranslationEntry | undefined => {
    for (const key in bundle) {
        const entries = bundle[key];
        if (entries.length) {
            const first = entries[0];
            if (first.value.value === value) {
                return first;
            }
        }
    }
    return undefined;
};
