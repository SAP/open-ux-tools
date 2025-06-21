import { EDITABLE_ENTRY_PREFIXES } from './types';

export function getTypeFromEditableItem(value: string | number): string | undefined {
    const valueStr = getBaseKey(value);
    for (const prefix of EDITABLE_ENTRY_PREFIXES) {
        if (!valueStr.toLocaleLowerCase().startsWith(prefix)) {
            continue;
        }
        // Text meets prefix requirement - extract data type (after prefix, before first digit character)
        const firstNumberIndex = valueStr.search(/\d/);
        return firstNumberIndex > prefix.length
            ? valueStr.substring(prefix.length, firstNumberIndex)
            : valueStr.substring(prefix.length);
    }
}

export function getBaseKey(value: string | number): string {
    let baseKey = value.toString();
    if (baseKey.includes('/')) {
        const parts = baseKey.split('/');
        baseKey = parts[parts.length - 1];
    }
    return baseKey;
}

export function isEditableValue(value?: string | number): boolean {
    if (!value) {
        return false;
    }
    const segments = value.toString().split('/');
    const editValue = segments[segments.length - 1];
    return EDITABLE_ENTRY_PREFIXES.some((prefix) => editValue.startsWith(prefix));
}

export function convertToPlaceholderText(value: string): string {
    const baseKey = getBaseKey(value);
    const type = getTypeFromEditableItem(value);
    if (type) {
        if (baseKey.includes('Entity')) {
            return `Enter new entity`;
        }
        return `Enter new property`;
    }

    return '';
}

/**
 * Validates a given value.
 * Ensures that the value starts with a letter, contains only alphanumeric characters,
 * and is not a reserved word.
 *
 * @param value The value to validate (optional).
 * @returns Returns an error message if invalid; otherwise `undefined`.
 */
export function validateValue(value?: string): string | undefined {
    if (value && (!value.match(/^[a-z][a-z0-9]*$/i))) {
        return 'Wrong value';
    }
}
