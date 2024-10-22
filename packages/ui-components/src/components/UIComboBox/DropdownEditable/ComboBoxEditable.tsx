import React, { Ref, useEffect, useRef, useState } from 'react';
import { UIComboBox } from '../UIComboBox';
import type { UIComboBoxProps, UIComboBoxRef, UISelectableOption } from '../UIComboBox';
import type { IComboBoxOption, ISelectableOption } from '@fluentui/react';
import { UITextInput } from '../../UIInput';
import { UIContextualMenu, UIContextualMenuItem } from '../../UIContextualMenu';
import { useOptions, useSelectedKey } from './hooks';
import { OptionKey, UISelectableOptionWithSubValues } from './types';
import { ItemInput, ItemInputRef } from './ItemInput';
import { isValueValid, RenamedEntries, resolveValueForOption, updateEditableEntry } from './utils';

import './ComboBoxEditable.scss';

export interface UIComboboxTestProps extends UIComboBoxProps {
    /**
     * Collection of options for this ComboBox.
     */
    options: UISelectableOptionWithSubValues[];
    // ToDo
    onChange?: (
        event: React.FormEvent<UIComboBoxRef>,
        option?: IComboBoxOption,
        index?: number,
        value?: string,
        selection?: OptionKey
    ) => void;
}

interface SubMenuData {
    target: HTMLElement | null;
    option?: UISelectableOptionWithSubValues;
}

function getOption(
    options: UISelectableOptionWithSubValues[],
    key?: string | number
): UISelectableOptionWithSubValues | undefined {
    return options.find((option) => option.key === key);
}

export const ComboBoxEditable = (props: UIComboboxTestProps) => {
    const { options, onChange, multiSelect } = props;
    const [selectedKey, updateSelection, convertedOptions] = useOptions(props.selectedKey, options, props.multiSelect);
    const [subMenu, setSubMenu] = useState<SubMenuData | null>(null);
    const { target, option: activeOption } = subMenu ?? {};
    const inputItemRefs = useRef<{ [key: string]: ItemInputRef | null }>({});
    const [_pendingText, setPendingText] = useState<string | undefined>(undefined);
    console.log('UIComboBoxDummy -> ' + JSON.stringify(selectedKey));
    // Set local ref in component context
    const selectedKeyRef = useRef<OptionKey>();
    selectedKeyRef.current = selectedKey;

    const handleChange = (
        event: React.FormEvent<UIComboBoxRef>,
        selectedOption?: UISelectableOptionWithSubValues,
        index?: number,
        triggerChange?: boolean
    ) => {
        if (!selectedOption) {
            return;
        }
        // Update local selection
        const result = updateSelection(selectedOption.key, selectedOption.selected);
        // Trigger change to outside
        if (triggerChange) {
            if (result.value) {
                onChange?.(
                    event,
                    selectedOption ? { ...selectedOption, key: result.value ?? selectedOption.key } : undefined,
                    index,
                    result.value,
                    result.selection
                );
            } else {
                onChange?.(event, undefined, undefined, '', undefined);
            }
        }

        // Close submenu
        setSubMenu(null);
    };

    return (
        <>
            <UIComboBox
                {...(props as any)}
                onChange={(
                    event: React.FormEvent<UIComboBoxRef>,
                    selectedOption?: UISelectableOptionWithSubValues,
                    index?: number
                ) => {
                    const triggerChange = multiSelect || !selectedOption?.editable;
                    handleChange(event, selectedOption, index, triggerChange);
                }}
                onItemClick={(
                    event: React.FormEvent<UIComboBoxRef>,
                    selectedOption?: UISelectableOptionWithSubValues,
                    index?: number
                ) => {
                    if (!multiSelect) {
                        handleChange(event, selectedOption, index, true);
                    }
                }}
                selectedKey={selectedKey}
                options={convertedOptions}
                onMenuOpen={() => {}}
                onMenuDismiss={() => {
                    setSubMenu(null);
                }}
                calloutProps={{
                    preventDismissOnEvent(event) {
                        let prevent = false;
                        if (event.type === 'focus' || event.type === 'click') {
                            const target = event.target as HTMLElement;
                            prevent = !!(
                                target.closest('.dropdown-submenu') || target.querySelector('.dropdown-submenu')
                            );
                        }
                        return prevent;
                    }
                }}
                onRenderList={(
                    props?: UISelectableOptionWithSubValues,
                    defaultRender?: (props?: UISelectableOptionWithSubValues) => JSX.Element | null
                ) => {
                    return (
                        <div
                            className='dropdown-menu-editable'
                            onMouseOver={(event) => {
                                const target = event.target as HTMLElement;
                                let element = target.closest('[data-index]') as HTMLElement;
                                if (!element) {
                                    element = target
                                        .closest('.ms-Checkbox')
                                        ?.querySelector('[data-index]') as HTMLElement;
                                }
                                if (element) {
                                    const index = element.getAttribute('data-index');
                                    if (index !== null) {
                                        const option = convertedOptions[parseInt(index)];
                                        const optionsCount = option?.options?.length ?? 0;
                                        if (optionsCount > 1) {
                                            setSubMenu({
                                                target: element.parentElement,
                                                option: convertedOptions[parseInt(index)]
                                            });
                                        }
                                    }
                                }
                            }}>
                            {defaultRender?.(props)}
                        </div>
                    );
                }}
                onRenderOption={(
                    props?: UISelectableOptionWithSubValues,
                    defaultRender?: (props?: UISelectableOptionWithSubValues) => JSX.Element | null
                ) => {
                    if (props?.editable) {
                        const { subValue } = props;
                        const option = getOption(convertedOptions, props?.key);
                        return (
                            <ItemInput
                                ref={(ref) => {
                                    inputItemRefs.current[props.key.toString()] = ref;
                                }}
                                renamedEntry={option?.text}
                                onChange={(
                                    event: React.FormEvent<HTMLInputElement | HTMLTextAreaElement>,
                                    value?: string
                                ) => {
                                    if (option) {
                                        option.text = value ?? option.text;
                                    }
                                    setPendingText(value);
                                    if (multiSelect) {
                                        handleChange({} as React.FormEvent<UIComboBoxRef>, option, undefined, true);
                                    }
                                }}
                                onClick={() => {
                                    updateSelection(props.key, true);
                                }}
                                option={props}
                            />
                        );
                    }
                    return defaultRender?.(props);
                }}
            />
            {target && activeOption?.options && (
                <UIContextualMenu
                    target={target}
                    className="dropdown-submenu"
                    onRestoreFocus={() => {
                        // No focus restore
                    }}
                    calloutProps={{
                        onMouseLeave: (event) => {
                            setSubMenu(null);
                        }
                    }}
                    onItemClick={(ev, item?: UIContextualMenuItem) => {
                        if (activeOption && item) {
                            activeOption.subValue = item;
                            inputItemRefs.current[activeOption.key]?.setOption(activeOption);
                        }
                        setSubMenu(null);
                    }}
                    directionalHint={11}
                    shouldFocusOnMount={false}
                    items={activeOption.options}
                />
            )}
        </>
    );
};
