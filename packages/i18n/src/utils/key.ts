import type { I18nBundle, I18nEntry } from './../types';

/**
 * Extract i18n key.
 *
 * @param input input content
 * @param key i18n key used. Default is `i18n`
 * @returns extracted key
 */
export function extractI18nKey(input: string, key = 'i18n'): string {
    input = input.trim();
    const regPattern = new RegExp(`^({@?${key}(>|&gt;))`, 'g');
    return input.replace(regPattern, '').replace(/\}$/gm, '').trim();
}

/**
 * Get unique key. If the key is not unique, it increment key by one and recheck.
 *
 * @param key new key and it is incremented
 * @param i18nData I18n entries
 * @param originalKey original key without any index increment
 * @param counter counter for increment
 * @returns unique key
 */
export function getI18nUniqueKey(
    key: string,
    i18nData: I18nEntry[] | I18nBundle,
    originalKey = key,
    counter = 1
): string {
    const uniqueKey = key;
    let keyExists = false;

    if (Array.isArray(i18nData)) {
        keyExists = i18nData.findIndex((item) => item.key.value === key) !== -1;
    } else {
        keyExists = i18nData[key] !== undefined;
    }

    if (keyExists) {
        key = `${originalKey}${counter}`;
        counter++;
        return getI18nUniqueKey(key, i18nData, originalKey, counter);
    }
    return uniqueKey;
}
