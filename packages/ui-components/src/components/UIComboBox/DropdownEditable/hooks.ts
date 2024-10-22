import { useEffect, useRef, useState } from 'react';
import { UISelectableOption } from '../UIComboBox';
import {
    isEditableValue,
    getTypeFromEditableItem,
    RenamedEntry,
    resolveValueForOption,
    getOption,
    isValueValid
} from './utils';
import type { OptionKey, SelectionUpdate, UISelectableOptionWithSubValues } from './types';
import { UIContextualMenuItem } from '../../UIContextualMenu';

function convertToEditableOptions(data: UISelectableOption[]): UISelectableOptionWithSubValues[] {
    const regularOptions = data.filter((item) => !isEditableValue(item.key));
    const editableOptions: UIContextualMenuItem[] = data
        .filter((item) => isEditableValue(item.key))
        .map((option) => ({
            key: option.key.toString(),
            text: getTypeFromEditableItem(option.key)
        }));

    if (editableOptions.length > 0) {
        const defaultOption =
            editableOptions.find((options) => {
                return getTypeFromEditableItem(options.key) === 'String';
            }) ?? editableOptions[0];
        const editableOption = {
            ...defaultOption,
            // ToDo - calculate editable option text
            text: '',
            options: editableOptions,
            editable: true,
            subValue: defaultOption
        } as UISelectableOptionWithSubValues;
        regularOptions.push(editableOption);
    }

    return regularOptions;
}

function findOptionByValue<T extends string | number | string[] | number[] | null | undefined>(
    options: UISelectableOptionWithSubValues[],
    value: T
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

/**
 * Hook for editable combobox options.
 *
 */
// export function useOptions(originalOptions: UISelectableOption[]): [UISelectableOptionWithSubValues[]] {
//     const [options, setOptions] = useState(convertToEditableOptions(originalOptions));

//     useEffect(() => {
//         const convertedOptions = convertToEditableOptions(originalOptions);
//         setOptions(convertedOptions);
//     }, [originalOptions]);

//     return [options];
// }

export function useOptions(
    externalSelectedKey: OptionKey,
    originalOptions: UISelectableOption[],
    multiSelect?: boolean
): [OptionKey, (selectedKey: OptionKey, checked?: boolean) => SelectionUpdate, UISelectableOptionWithSubValues[]] {
    const [options, setOptions] = useState(convertToEditableOptions(originalOptions));
    const [_selectedKey, setSelectedKey] = useState<OptionKey>(externalSelectedKey);
    const selection = useRef<OptionKey>(externalSelectedKey);
    useEffect(() => {
        const optionKey = findOptionByValue(options, externalSelectedKey);
        selection.current = (optionKey?.key as OptionKey);
        if (selection.current) {
            setSelectedKey(selection.current);
        }
    }, [externalSelectedKey]);

    useEffect(() => {
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
        if (!Array.isArray(key) && key) {
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

// DUPLICATE!!!!
export function convertToPlaceholderText(placeholder: string): string {
    const type = getTypeFromEditableItem(placeholder);
    if (type) {
        // return `Enter new ${type} property`;
        return `Enter new property`;
    }

    return placeholder;
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
): [string | undefined, string | undefined, (value: string | undefined) => void] {
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
    const placeholder = propValue && (!edited.current || !value) ? convertToPlaceholderText(propValue) : undefined;
    return [value, placeholder, updateValue];
}
