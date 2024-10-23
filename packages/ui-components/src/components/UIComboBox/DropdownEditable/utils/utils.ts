import { useCallback, useRef } from 'react';
import { EDITABLE_ENTRY_PREFIXES, type RenamedEntries } from './types';
import { UIContextualMenuItem } from '../../../UIContextualMenu';
import { UISelectableOptionWithSubValues } from '../types';

export function isEditableValue(value?: string | number): boolean {
    if (!value) {
        return false;
    }
    const segments = value.toString().split('/');
    const editValue = segments[segments.length - 1];
    return EDITABLE_ENTRY_PREFIXES.some((prefix) => editValue.startsWith(prefix));
}

export function getBaseKey(value: string | number): string {
    let baseKey = value.toString();
    if (baseKey.includes('/')) {
        const parts = baseKey.split('/');
        baseKey = parts[parts.length - 1];
    }
    return baseKey;
}

export function getTypeFromEditableItem(value: string | number): string | undefined {
    const baseKey = getBaseKey(value);
    for (const prefix of EDITABLE_ENTRY_PREFIXES) {
        if (!baseKey.toLocaleLowerCase().startsWith(prefix)) {
            continue;
        }
        // Text meets prefix requirement - extract data type (after prefix, before first digit character)
        const firstNumberIndex = baseKey.search(/\d/);
        return firstNumberIndex > prefix.length
            ? baseKey.substring(prefix.length, firstNumberIndex)
            : baseKey.substring(prefix.length);
    }
}

export const updateEditableEntry = (
    renamedEntries: RenamedEntries,
    key: string | number,
    value?: string,
    subValue?: UIContextualMenuItem
): void => {
    const keyStr = key.toString();
    let renamedEntry = renamedEntries[keyStr];
    if (!renamedEntry) {
        renamedEntry = renamedEntries[keyStr] = {};
    }
    if (value !== undefined) {
        renamedEntries[keyStr].fullValue = keyStr;
        renamedEntries[keyStr].displayValue = value;
    }
    if (subValue !== undefined) {
        renamedEntries[keyStr].subValue = subValue;
    }
};

export const resolveValueForOption = (option: UISelectableOptionWithSubValues | UIContextualMenuItem): string => {
    if (!option.editable) {
        return option.key.toString();
    }
    const { text, subValue } = option;
    const value = subValue ? subValue.key : option.key;
    if (text !== undefined) {
        return `${value}-${text.replace(/\s/g, '')}`;
    }
    return value.toString();
};

export const isValueValid = (option: UISelectableOptionWithSubValues | UIContextualMenuItem): boolean => {
    return !option.editable || !!option.text;
};

// ToDo - remove duplicate
export function getOption(
    options: UISelectableOptionWithSubValues[],
    key?: string | number | null
): UISelectableOptionWithSubValues | undefined {
    return options.find((option) => option.key === key);
}
