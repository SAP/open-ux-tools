import { useEffect, useRef, useState } from 'react';
import { UISelectableOption, UISelectableOptionMenuItemType } from '../UIComboBox';
import {
    isEditableValue,
    getTypeFromEditableItem,
    resolveValueForOption,
    getOption,
    isValueValid,
    convertToPlaceholderText,
} from './utils';
import type { OptionKey, SelectionUpdate, UISelectableOptionWithSubValues } from './types';
import { UIContextualMenuItem } from '../../UIContextualMenu';

function findOptionByValue(
    options: UISelectableOptionWithSubValues[],
    value?: string | number | null
): UISelectableOptionWithSubValues | undefined {
    for (const option of options) {
        if (
            resolveValueForOption(option) === value ||
            option.options?.some((subOption) => resolveValueForOption(subOption) === value)
        ) {
            return option;
        }
    }
    return undefined;
}

function getTextFromFullPath(text: string): string {
    if (!text || !text.includes('/')) {
        return text;
    }
    const parts = text.split('/');
    return parts[parts.length - 1];
}

function getGroupKey(key: string | number): string {
    key = key.toString();
    return key.includes('/') ? key.split('/')[0] : '';
}

function findIndices(data: UISelectableOption[], checkGroupKey: string): { first: number; last: number } {
    const indexes = {
        last: -1,
        first: data.findIndex((item) => {
            return checkGroupKey === getGroupKey(item.key);
        })
    };
    for (let i = data.length - 1; i >= 0; i--) {
        const item = data[i];
        if (checkGroupKey === getGroupKey(item.key)) {
            indexes.last = i;
            break;
        }
    }

    return indexes;
}

function convertToEditableOptions(data: UISelectableOption[]): UISelectableOptionWithSubValues[] {
    // Filter out non-editable options (not starting with zz_ or similar patterns)
    const regularOptions = data.filter((item) => !isEditableValue(item.key));

    // Group editable options by base key (e.g., "zz_newBoolean", "bookings/zz_newBoolean3")
    const groupedEditableOptions: { [baseKey: string]: UISelectableOptionWithSubValues } = {};

    data.filter((item) => isEditableValue(item.key)).forEach((item) => {
        const type = getTypeFromEditableItem(item.key);

        // Group by base key, default to the first occurrence of a base key as subValue
        const key = item.key.toString();
        const baseKey = key.includes('/') ? key.split('/')[0] : '';
        let groupOption = groupedEditableOptions[baseKey];
        if (!groupOption) {
            groupOption = groupedEditableOptions[baseKey] = {
                key: item.key,
                text: '',
                options: [],
                editable: true,
                subValue: { key: item.key.toString(), text: type },
                placeholder: convertToPlaceholderText(key)
            };
        }
        if (groupOption.options && !groupOption.options.some((option) => option.text === type)) {
            groupOption.options.push({
                key: item.key.toString(),
                text: type
            });
        }
    });
    if (Object.keys(groupedEditableOptions).length) {
        // Remove header prefix from regular non-editoable option
        for (const option of regularOptions) {
            option.text = getTextFromFullPath(option.text);
        }
    }
    // Combine regular options with the grouped editable ones
    for (const groupId in groupedEditableOptions) {
        // Set default sub value as string
        const defaultSubValue = groupedEditableOptions[groupId].options?.find((option) => option.text === 'String');
        if (defaultSubValue) {
            groupedEditableOptions[groupId].subValue = defaultSubValue;
        }
        const { first, last } = findIndices(regularOptions, groupId);
        let diff = 1;
        // Insert header item
        if (groupId && first !== -1) {
            regularOptions.splice(first, 0, {
                key: groupId,
                text: groupId,
                itemType: UISelectableOptionMenuItemType.Divider
            });
            regularOptions.splice(first + 1, 0, {
                key: groupId,
                text: groupId,
                itemType: UISelectableOptionMenuItemType.Header
            });
            diff += 2;
        }
        // Insert edit item
        if (last !== -1) {
            regularOptions.splice(last + diff, 0, groupedEditableOptions[groupId]);
        } else {
            regularOptions.push(groupedEditableOptions[groupId]);
        }
    }
    return regularOptions;
}

function areArraysEqualByKeyAndText(array1: UISelectableOption[], array2: UISelectableOption[]): boolean {
    // First, check if both arrays are the same length
    if (array1.length !== array2.length) {
        return false;
    }

    // Then, compare each element's `text` and `key` properties
    return array1.every((option1, index) => {
        const option2 = array2[index];
        return option1.key === option2.key && option1.text === option2.text;
    });
}

export function useOptions(
    externalSelectedKey: OptionKey,
    originalOptions: UISelectableOption[],
    multiSelect?: boolean
): [OptionKey, (selectedKey: OptionKey, checked?: boolean) => SelectionUpdate, UISelectableOptionWithSubValues[]] {
    const [options, setOptions] = useState(convertToEditableOptions(originalOptions));
    const [selectedKey, setSelectedKey] = useState<OptionKey>(externalSelectedKey);
    const selection = useRef<OptionKey>(externalSelectedKey ?? selectedKey);
    const previousOptions = useRef<UISelectableOptionWithSubValues[]>(originalOptions);
    useEffect(() => {
        if (Array.isArray(externalSelectedKey)) {
            const newKey: Array<string | number> = [];
            for (const key of externalSelectedKey) {
                const optionKey = findOptionByValue(options, key);
                if (optionKey?.key) {
                    newKey.push(optionKey.key);
                }
            }
            selection.current = newKey as OptionKey;
        } else {
            for (const option of options) {
                delete option.selected;
            }
            const option = findOptionByValue(options, externalSelectedKey);
            selection.current = option?.key as OptionKey;
        }
        if (selection.current) {
            setSelectedKey(selection.current);
        }
    }, [externalSelectedKey]);

    useEffect(() => {
        // Check if original options was changed
        if (areArraysEqualByKeyAndText(originalOptions, previousOptions.current)) {
            return;
        }
        previousOptions.current = originalOptions;
        // Original options changes - recalculate
        let editableOptions: UISelectableOptionWithSubValues[] = [];
        if (options.length) {
            editableOptions = options.filter((option) => option.editable);
        }
        const convertedOptions = convertToEditableOptions(originalOptions);
        for (const editableOption of editableOptions) {
            const option = convertedOptions.find((convertedOption) => convertedOption.key === editableOption.key);
            if (option) {
                option.text = editableOption.text;
                option.subValue = editableOption.subValue;
            }
        }
        setOptions(convertedOptions);
    }, [originalOptions]);

    const updateSelection = (key: OptionKey, selected = true): SelectionUpdate => {
        const result: SelectionUpdate = {};
        if (multiSelect) {
            let selectedKeys: string[] | number[] = [];
            if (selection.current) {
                selectedKeys = Array.isArray(selection.current)
                    ? selection.current
                    : ([selection.current] as string[] | number[]);
            }
            // const newKeys = [...new Set([...(selectedKeys ?? []), key].filter((k) => (selected ? true : k !== key)))];
            // Avoid duplicates
            const newKeys = selected
                ? [...new Set([...(selectedKeys ?? []), key])]
                : selectedKeys?.filter((k) => k !== key) ?? [];
            selection.current = newKeys as string[];
        } else {
            selection.current = key;
        }
        result.localSelection = selection.current;
        // Resolve values for save
        if (Array.isArray(result.localSelection)) {
            result.selection = [];
            for (const key of result.localSelection) {
                const option = getOption(options, key);
                const resolveValue = option ? resolveValueForOption(option) : key.toString();
                if (!option?.editable || isValueValid(option)) {
                    result.selection.push(resolveValue as never);
                }
            }
        }
        // Resolve latest/changed value
        if (!Array.isArray(key) && key !== undefined && key !== null) {
            const option = getOption(options, key);
            if (!option?.editable || isValueValid(option)) {
                const resolveValue = option ? resolveValueForOption(option) : key?.toString();
                result.value = resolveValue;
            }
        }

        setSelectedKey(selection.current);

        return result;
    };

    return [selection.current, updateSelection, options];
}

export function useSelectedKey<T extends string | number | string[] | number[] | null | undefined>(
    externalSelectedKey: T,
    options: UISelectableOptionWithSubValues[]
): [T, (selectedKey: T) => void] {
    const [selectedKey, setSelectedKey] = useState<T>(externalSelectedKey);
    useEffect(() => {
        setSelectedKey(externalSelectedKey);
    }, [externalSelectedKey]);

    return [selectedKey, setSelectedKey];
}

/**
 * Hook for value update for input components.
 *
 * @param initialValue - Initial/default value
 * @param propValue - External value from component properties
 * @returns Returns a stateful value, and a function to update it.
 */
export function useEditValue(
    initialValue?: string,
    propValue?: string,
    editedValue?: string | undefined
): [string | undefined, (value: string | undefined) => void] {
    const [value, setValue] = useState(editedValue ?? propValue ?? initialValue);
    const edited = useRef<boolean>(!!editedValue);

    useEffect(() => {
        if (editedValue) {
            edited.current = true;
        }
        // Update the local state value if new value from props is received
        // const externalValue = renamedEntry?.displayValue ?? propValue;
        const externalValue = editedValue;
        if (externalValue && externalValue !== value) {
            setValue(externalValue);
        }
    }, [propValue, editedValue]);

    const updateValue = (newValue: string | undefined) => {
        setValue(newValue);
        edited.current = true;
    };
    return [value, updateValue];
}
