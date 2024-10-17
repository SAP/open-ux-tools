import { useCallback, useRef } from 'react';
import { EDITABLE_ENTRY_PREFIXES, type RenamedEntries } from './types';
import { UIContextualMenuItem } from '../../../UIContextualMenu';
import { UISelectableOptionWithSubValues } from '../types';

export const useRenames = (): [RenamedEntries, (updatedEntries?: RenamedEntries) => void] => {
    const renames = useRef<RenamedEntries>({});
    const updateEntries = useCallback(
        (updatedEntries?: RenamedEntries) => {
            renames.current = updatedEntries ?? {};
        },
        [renames.current]
    );
    return [renames.current, updateEntries];
};

export const isValueEmpty = (value: string, renamedEntries: RenamedEntries): boolean => {
    if (isEditableValue(value)) {
        const renamedValue = renamedEntries[value];
        return !renamedValue?.displayValue;
    }
    return !value;
};

export const resolveValues = (values: string[], renamedEntries: RenamedEntries): string[] => {
    const valuesAfterRename = [...values];
    for (let i = 0; i < valuesAfterRename.length; i++) {
        valuesAfterRename[i] = resolveValue(valuesAfterRename[i], renamedEntries);
    }
    return valuesAfterRename;
};

export const resolveValue = (value: string | number, renamedEntries: RenamedEntries): string => {
    const renamedValue = renamedEntries[value];
    if (renamedValue?.displayValue !== undefined) {
        if (renamedValue.subValue) {
            value = renamedValue.subValue.key;
        }
        return `${value}-${renamedValue.displayValue.replace(/\s/g, '')}`;
    }
    return value.toString();
};

export function isEditableValue(value?: string | number): boolean {
    if (!value) {
        return false;
    }
    const segments = value.toString().split('/');
    const editValue = segments[segments.length - 1];
    return EDITABLE_ENTRY_PREFIXES.some((prefix) => editValue.startsWith(prefix));
}

export function getTypeFromEditableItem(value: string | number): string | undefined {
    const valueStr = value.toString();
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
    let value = subValue ? subValue.key : option.key;
    if (text !== undefined) {
        return `${value}-${text.replace(/\s/g, '')}`;
    }
    return value.toString();
};

export const isValueValid = (option: UISelectableOptionWithSubValues | UIContextualMenuItem): boolean => {
    if (option.editable && !option.text) {
        return false;
    }
    return true;
};
