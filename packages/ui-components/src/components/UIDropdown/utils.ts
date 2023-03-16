import type { IComboBoxProps, IDropdownProps } from '@fluentui/react';

/**
 * Method checks if drodpown or combobox is empty or any value is selected.
 *
 * @param {Partial<IDropdownProps | IComboBoxProps>} props Dropdown or combobox props.
 * @returns {boolean} Is dropdown or combobox empty.
 */
export function isDropdownEmpty(props: Partial<IDropdownProps | IComboBoxProps>): boolean {
    const { selectedKey } = props;
    if (Array.isArray(selectedKey)) {
        return selectedKey.length === 0;
    }
    if (('text' in props && props.text) || ('selectedKeys' in props && props.selectedKeys?.length)) {
        return false;
    }
    return !selectedKey;
}
