import type React from 'react';
import { useState, useEffect } from 'react';

/**
 * Get full control key.
 *
 * @param key
 * @returns {string}
 */
function fullKey(key: string): string {
    return `com.sap.ux.control-property-editor.${key}`;
}
/**
 * Use local storage.
 *
 * @param key
 * @param defaultValue
 * @returns {[T, React.Dispatch<T>]}
 */
export function useLocalStorage<T>(key: string, defaultValue: T): [T, React.Dispatch<T>] {
    const [value, setValue] = useState(() => {
        const savedValue = localStorage.getItem(fullKey(key));

        if (!savedValue) {
            return defaultValue;
        }

        try {
            return JSON.parse(savedValue);
        } catch (e) {
            return defaultValue;
        }
    });

    useEffect(() => {
        localStorage.setItem(fullKey(key), JSON.stringify(value));
    }, [key, value]);

    return [value, setValue];
}
