import type { I18nBundle, TranslationEntry } from './UITranslationButton.types';
import { TranslationKeyGenerator, TranslationTextPattern } from './UITranslationButton.types';

// type PatternResolutionMethod = () => string | undefined;
// const PATTERN_RESOLUTION = new Map<TranslationTextPattern, PatternResolutionMethod>([]);

/**
 * Method extracts i18n binding and returns key of i18n entry.
 * @param {string} value - Binding value.
 * @param {TranslationTextPattern[]} patterns - Check if method should resolve syntax annotation based i18n binding.
 * @returns {string | undefined} I18n entry key or undefined if input does not matches i18n binding pattern.
 */
export const extractI18nKey = (
    value: string,
    patterns: TranslationTextPattern[],
    prefix: string
): string | undefined => {
    let key: string | undefined;
    for (const pattern of patterns) {
        if (pattern === TranslationTextPattern.SingleBracketBinding) {
            const i18nMatch = value.toString().match(`^{${prefix}>([^\\{}:]+)}$`);
            key = i18nMatch?.[1];
        } else if (pattern === TranslationTextPattern.DoubleBracketReplace && value.match(`^{{[^\\{}:]+}}$`)) {
            key = value.toString().substring(2, value.length - 2);
        }
    }
    return key;
};

/**
 * Convert to camel case
 *
 * It gets input like 'product details info' and convert it
 * to 'productDetailsInfo'
 *
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
 * Convert to pascal case
 *
 * It gets input like 'product details info' and convert it
 * to 'ProductDetailsInfo'
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
 * Get unique key
 *
 * If the key is not unique, it increment key by one and recheck
 *
 * @param key new key and it is incremented
 * @param i18nData I18n entries
 * @param originalKey original key without any index increment
 * @param counter counter for increment
 * @returns {string} Generated i18n key.
 */
export const getI18nUniqueKey = (key: string, i18nData: I18nBundle, originalKey = key, counter = 1): string => {
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
 * @param text
 * @param translationKeyGenerator
 * @param bundle
 * @returns {string} Generated i18n key.
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
