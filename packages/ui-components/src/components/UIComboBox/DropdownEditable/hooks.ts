import { useEffect, useRef, useState } from 'react';
import { UISelectableOption, UISelectableOptionMenuItemType } from '../UIComboBox';
import {
    isEditableValue,
    getTypeFromEditableItem,
    resolveValueForOption,
    getOption,
    isValueValid,
    convertToPlaceholderText
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
        const defaultSubValue = getDefaultSubOption(groupedEditableOptions[groupId].options);
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

/**
 * Retrieves keys of items that are marked as editable and have text.
 *
 * @param options An array of selectable options, each with possible sub-values.
 * @returns An array of keys for the options that are editable and contain text.
 */
function getEditedItems(options: UISelectableOptionWithSubValues[]): Array<string | number> {
    const editedItems: Array<string | number> = [];
    for (const option of options) {
        if (option.editable && option.text) {
            editedItems.push(option.key);
        }
    }
    return editedItems;
}

/**
 * Creates a deep clone of a given item, modifying its key, name, and value with a provided index.
 *
 * @param item The item (IGroup or TreeNode) to be cloned.
 * @param index The index used to differentiate the cloned item.
 * @returns A deep clone of the item with updated key, name, and value.
 */
function cloneOption(option: UISelectableOptionWithSubValues, index: number): UISelectableOptionWithSubValues {
    const optionClone = structuredClone(option);
    optionClone.key = `${option.key}-${index}`;
    optionClone.text = '';
    optionClone.clone = true;
    for (const subOption of optionClone.options ?? []) {
        subOption.key = `${subOption.key}-${index}`;
    }
    const defaultSubValue = getDefaultSubOption(optionClone.options);
    optionClone.subValue = defaultSubValue ?? {
        key: optionClone.key,
        text: getTypeFromEditableItem(option.key)
    };

    return optionClone;
}

/**
 * Parses a key string to separate the base key and its clone index.
 *
 * @param value The key value to parse, expected in the format "key-index".
 * @returns An object containing the base key and the clone index.
 */
function parseCloneKey(value: string): { index: number; key: string } {
    const match = value.match(/^(.+)-(\d+)$/);
    if (match) {
        return {
            key: match[1],
            index: parseInt(match[2], 10)
        };
    }
    return {
        key: value,
        index: 0
    };
}

/**
 * Creates a clone of an option with an incremented clone index and inserts it in the options array.
 *
 * @param options The list of selectable options with potential sub-values.
 * @param editedKey The key of the option to be cloned.
 * @returns A new array of options with the cloned option inserted.
 */
function applyEditClone(
    options: UISelectableOptionWithSubValues[],
    editedKey: string | number
): UISelectableOptionWithSubValues[] | undefined {
    let insertIndex = -1;
    for (let i = 0; i < options.length; i++) {
        const option = options[i];
        if (option.key === editedKey) {
            insertIndex = i;
            break;
        }
    }
    let originalOption: UISelectableOptionWithSubValues | undefined = options[insertIndex];
    let cloneIndex = 1;
    if (originalOption?.clone) {
        const clodeData = parseCloneKey(originalOption.key.toString());
        originalOption = options.find((option) => option.key === clodeData.key);
        cloneIndex = clodeData.index + 1;
    }
    if (!originalOption) {
        return;
    }

    const optionClone = cloneOption(originalOption, cloneIndex);
    options.splice(insertIndex + 1, 0, optionClone);
    return [...options];
}

/**
 * Custom hook to manage selectable options and selection updates, with support for multi-select and dynamically editable options.
 *
 * @param externalSelectedKey The key representing the currently selected option or options.
 * @param originalOptions The original list of selectable options, potentially without edits.
 * @param multiSelect If true, allows multiple options to be selected simultaneously.
 * @returns Returns a tuple containing the current selection, a function to update the selection and the list of editable options with potential sub-values.
 */
export function useOptions(
    externalSelectedKey: OptionKey,
    originalOptions: UISelectableOption[],
    multiSelect?: boolean
): [OptionKey, (selectedKey: OptionKey, checked?: boolean) => SelectionUpdate, UISelectableOptionWithSubValues[]] {
    const [options, setOptions] = useState(convertToEditableOptions(originalOptions));
    const [selectedKey, setSelectedKey] = useState<OptionKey>(externalSelectedKey);
    const selection = useRef<OptionKey>(externalSelectedKey ?? selectedKey);
    const previousOptions = useRef<UISelectableOptionWithSubValues[]>(originalOptions);
    const currentEditedKeys = getEditedItems(options);
    const cachedEditedKeys = useRef<Array<string | number>>(currentEditedKeys);
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

    useEffect(() => {
        // Enable multiple inputs: a new input appears when the user enters the first character into the last input
        if (!multiSelect) {
            return;
        }
        const newEdit = currentEditedKeys.find((key) => !cachedEditedKeys.current.includes(key));
        if (newEdit) {
            cachedEditedKeys.current = currentEditedKeys;
            // Append new clone to stack
            const changeOptions = applyEditClone(options, newEdit);
            if (changeOptions) {
                setOptions(changeOptions);
            }
        }
    }, [currentEditedKeys, multiSelect]);

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

function getDefaultSubOption(options?: UIContextualMenuItem[]): UIContextualMenuItem | undefined {
    return options?.find((option) => option.text === 'String');
}
