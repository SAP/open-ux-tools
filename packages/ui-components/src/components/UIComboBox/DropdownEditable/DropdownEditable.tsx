import React, { useRef, useState } from 'react';
import { UIComboBox } from '../UIComboBox';
import type { UIComboBoxOption, UIComboBoxProps, UIComboBoxRef } from '../UIComboBox';
import { UIContextualMenu, UIContextualMenuItem } from '../../UIContextualMenu';
import { useOptions } from './hooks';
import { OptionKey, SubMenuData, UISelectableOptionWithSubValues } from './types';
import { ItemInput, ItemInputRef } from './ItemInput';

import './DropdownEditable.scss';
import { getOption } from './utils';
import {
    UIDropdown,
    UIDropdownOption,
    UIDropdownProps,
    UIDropdownRef,
    UISelectableDroppableTextProps
} from '../../UIDropdown';
import { ISelectableDroppableTextProps } from '@fluentui/react';

export interface DropdownEditableProps extends UIDropdownProps {
    /**
     * Collection of options for this ComboBox.
     */
    options: UISelectableOptionWithSubValues[];
    onChange?: (
        event: React.FormEvent<HTMLDivElement>,
        option?: UIDropdownOption,
        index?: number,
        value?: string,
        selection?: OptionKey
    ) => void;
    // (event: React.FormEvent<HTMLDivElement>, option?: IDropdownOption, index?: number) => void
}

export const DropdownEditable = (props: DropdownEditableProps) => {
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
        event: React.FormEvent<HTMLDivElement>,
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
            <UIDropdown
                {...props}
                ref={undefined}
                className="editable-dropdown"
                selectedKey={!multiSelect ? selectedKey : undefined}
                selectedKeys={multiSelect && Array.isArray(selectedKey) ? selectedKey : undefined}
                options={convertedOptions}
                onChange={(
                    event: React.FormEvent<HTMLDivElement>,
                    selectedOption?: UISelectableOptionWithSubValues,
                    index?: number
                ) => {
                    handleChange(event, selectedOption, index, true);
                    delayedChange.current = false;
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
                            if (
                                !multiSelect &&
                                selectedKeyRef.current &&
                                !Array.isArray(selectedKeyRef.current) &&
                                delayedChange.current
                            ) {
                                const changedOption = getOption(convertedOptions, selectedKeyRef.current);
                                handleChange({} as React.FormEvent<HTMLDivElement>, changedOption, undefined, true);
                            }
                        }
                    },
                    onMouseOver: (event) => {
                        const target = event.target as HTMLElement;
                        let element = target.closest('[data-index]') as HTMLElement;
                        if (!element) {
                            element = target.closest('.ms-Checkbox')?.querySelector('[data-index]') as HTMLElement;
                        }
                        if (element) {
                            const index = element.getAttribute('data-index');
                            if (index !== null) {
                                const option = convertedOptions[parseInt(index)];
                                const optionsCount = option?.options?.length ?? 0;
                                if (optionsCount > 1) {
                                    setSubMenu({
                                        // todo? - diff between combobox
                                        target: multiSelect ? element.parentElement : element,
                                        option: convertedOptions[parseInt(index)]
                                    });
                                }
                            }
                        }
                    }
                }}
                onRenderOption={(props, defaultRender) => {
                    if (props && 'editable' in props && props.editable) {
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
                                            {} as React.FormEvent<HTMLDivElement>,
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
                                option={props as UISelectableOptionWithSubValues}
                            />
                        );
                    }
                    return defaultRender?.(props) ?? null;
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
                    delayUpdateFocusOnHover={true}
                />
            )}
        </>
    );
};
