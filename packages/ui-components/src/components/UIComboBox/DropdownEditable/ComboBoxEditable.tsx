import React, { useRef, useState } from 'react';
import { UIComboBox } from '../UIComboBox';
import type { UIComboBoxOption, UIComboBoxProps, UIComboBoxRef } from '../UIComboBox';
import { UIContextualMenu, UIContextualMenuItem } from '../../UIContextualMenu';
import { useOptions } from './hooks';
import { OptionKey, SubMenuData, UISelectableOptionWithSubValues } from './types';
import { ItemInput, ItemInputRef } from './ItemInput';

import './ComboBoxEditable.scss';
import { getOption } from './utils';
import { SubMenuContextMenu } from './SubMenuContextMenu';

export interface ComboBoxEditableProps extends UIComboBoxProps {
    /**
     * Collection of options for this ComboBox.
     */
    options: UISelectableOptionWithSubValues[];
    // ToDo
    onChange?: (
        event: React.FormEvent<UIComboBoxRef>,
        option?: UIComboBoxOption,
        index?: number,
        value?: string,
        selection?: OptionKey
    ) => void;
}

export const ComboBoxEditable = (props: ComboBoxEditableProps) => {
    const { options, onChange, multiSelect } = props;
    const [selectedKey, updateSelection, convertedOptions] = useOptions(props.selectedKey, options, props.multiSelect);
    const [subMenu, setSubMenu] = useState<SubMenuData | null>(null);
    const { target, option: activeOption } = subMenu ?? {};
    const inputItemRefs = useRef<{ [key: string]: ItemInputRef | null }>({});
    const [pendingText, setPendingText] = useState<string | undefined>(undefined);
    // Set local ref in component context
    const selectedKeyRef = useRef<OptionKey>();
    selectedKeyRef.current = selectedKey;
    const delayedChange = useRef<boolean>(false);

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
                    selectedOption ? { ...selectedOption, key: result.value } : undefined,
                    index,
                    result.value,
                    result.selection
                );
            } else {
                onChange?.(
                    event,
                    // Simulate empty item selection
                    selectedOption ? { ...selectedOption, key: '' } : undefined,
                    undefined,
                    '',
                    undefined
                );
            }
        }

        // Close submenu
        setSubMenu(null);
    };

    return (
        <>
            <UIComboBox
                {...(props as any)}
                className="editable-combobox"
                // ToDo(before making feature without switch) - recheck if we need check text when passed through props
                text={selectedKey === undefined ? pendingText : undefined}
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
                    if (!multiSelect && selectedKeyRef.current && !Array.isArray(selectedKeyRef.current)) {
                        const changedOption = getOption(convertedOptions, selectedKeyRef.current);
                        handleChange({} as React.FormEvent<UIComboBoxRef>, changedOption, undefined, true);
                    }
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
                    },
                    layerProps: {
                        onLayerWillUnmount: () => {
                            setSubMenu(null);
                        }
                    }
                }}
                onRenderList={(
                    props?: UISelectableOptionWithSubValues,
                    defaultRender?: (props?: UISelectableOptionWithSubValues) => JSX.Element | null
                ) => {
                    return (
                        <div
                            className="dropdown-menu-editable"
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
                        const option = getOption(convertedOptions, props?.key);
                        return (
                            <ItemInput
                                ref={(ref) => {
                                    inputItemRefs.current[props.key.toString()] = ref;
                                }}
                                placeholder={option?.placeholder}
                                renamedEntry={option?.text}
                                onChange={(
                                    event: React.FormEvent<HTMLInputElement | HTMLTextAreaElement>,
                                    value?: string
                                ) => {
                                    const changedOption = getOption(convertedOptions, props?.key);
                                    if (changedOption) {
                                        changedOption.text = value ?? changedOption.text;
                                    }
                                    setPendingText(value);
                                    if (multiSelect) {
                                        handleChange(
                                            {} as React.FormEvent<UIComboBoxRef>,
                                            changedOption,
                                            undefined,
                                            true
                                        );
                                    } else {
                                        delayedChange.current = true;
                                    }
                                }}
                                onClick={() => {
                                    updateSelection(props.key, true);
                                }}
                                onEnter={(event) => {
                                    if (!multiSelect) {
                                        const target = event.target as HTMLElement;
                                        // Simulate selection by clicking on related item
                                        (target.closest('.ms-Button') as HTMLElement)?.click();
                                    }
                                }}
                                option={props}
                            />
                        );
                    }
                    return defaultRender?.(props);
                }}
            />
            {target && activeOption?.options && (
                <SubMenuContextMenu
                    items={activeOption.options}
                    target={target}
                    onItemClick={(ev, item?: UIContextualMenuItem) => {
                        if (activeOption && item) {
                            activeOption.subValue = item;
                            inputItemRefs.current[activeOption.key]?.setOption(activeOption);
                        }
                    }}
                    hideSubmenu={() => {
                        setSubMenu(null);
                    }}
                />
            )}
        </>
    );
};
