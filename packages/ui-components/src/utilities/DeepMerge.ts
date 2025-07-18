import React from 'react';

/**
 * Performs deep merge on two objects.
 * Parameters are not mutated.
 * Arrays are copied as references and are not merged.
 *
 * @param a
 * @param b
 * @param ignore Ignore names of properties
 * @returns  Record<string, unknown>
 */
export function deepMerge(a: any, b: any, ignore: string[] = []): Record<string, unknown> {
    const result = Object.keys(a).length ? deepMerge({}, a, ignore) : {};
    const keys = Object.keys(b);
    for (const key of keys) {
        const value = b[key];
        if (isObject(value) && !ignore.includes(key)) {
            if (!result[key] || isObject(result[key])) {
                result[key] = deepMerge(result[key] ?? {}, value, ignore);
            } else {
                throw new Error('Object structures are not compatible!');
            }
        } else {
            result[key] = value;
        }
    }
    return result;
}

/**
 * Method checks item is object.
 *
 * @param item
 * @returns boolean
 */
function isObject(item: unknown): boolean {
    if (!item) {
        return false;
    }
    return typeof item === 'object' && !Array.isArray(item) && !React.isValidElement(item);
}
