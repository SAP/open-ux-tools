import React from 'react';

/**
 * Performs deep merge on two objects.
 * Parameters are not mutated.
 * Arrays are copied as references and are not merged.
 *
 * @param a
 * @param b
 * @returns  Record<string, unknown>
 */
export function deepMerge(a: any, b: any): Record<string, unknown> {
    const result = Object.keys(a).length ? deepMerge({}, a) : {};
    const keys = Object.keys(b);
    for (const key of keys) {
        const value = b[key];
        if (isObject(value)) {
            if (!result[key] || isObject(result[key])) {
                result[key] = deepMerge(result[key] ?? {}, value);
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
