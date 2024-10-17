import React, { Ref, useEffect, useRef, useState } from 'react';
import { UIComboBox } from '../UIComboBox';
import type { UIComboBoxProps, UIComboBoxRef, UISelectableOption } from '../UIComboBox';
import type { IComboBoxOption, ISelectableOption } from '@fluentui/react';
import { UITextInput } from '../../UIInput';
import { UIContextualMenu, UIContextualMenuItem } from '../../UIContextualMenu';
import { useOptions, useSelectedKey } from './hooks';
import { UISelectableOptionWithSubValues } from './types';
import { ItemInput, ItemInputRef } from './ItemInput';
import { isValueValid, RenamedEntries, resolveValue, resolveValueForOption, updateEditableEntry } from './utils';

export interface UIComboboxTestProps extends UIComboBoxProps {
    /**
     * Collection of options for this ComboBox.
     */
    options: UISelectableOptionWithSubValues[];
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

export const UIComboBoxDummy = (props: UIComboboxTestProps) => {
    const { options, onChange } = props;
    const [selectedKey, setSelectedKey, convertedOptions] = useOptions(props.selectedKey, options);
    const [subMenu, setSubMenu] = useState<SubMenuData | null>(null);
    const { target, option: activeOption } = subMenu ?? {};
    const inputItemRefs = useRef<{ [key: string]: ItemInputRef | null }>({});
    const [_pendingText, setPendingText] = useState<string | undefined>(undefined);
    // console.log('UIComboBoxDummy -> ' + selectedKey);

    const triggerChange = (
        event: React.FormEvent<UIComboBoxRef>,
        selectedOption?: UISelectableOptionWithSubValues,
        index?: number,
        value?: string
    ) => {
        if (selectedOption) {
            setSelectedKey(selectedOption.key);
        }
        const option = getOption(convertedOptions, selectedOption?.key);
        const resolveValue = option ? resolveValueForOption(option) : selectedOption?.key.toString();
        // console.log(resolveValue);
        if (selectedOption?.editable && option && !isValueValid(option)) {
            console.log('Invalid!!!');
            onChange?.(event, undefined, undefined, '');
        } else {
            console.log('valid!!!');
            onChange?.(
                event,
                selectedOption ? { ...selectedOption, key: resolveValue ?? selectedOption.key } : undefined,
                index,
                resolveValue ?? value
            );
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
                    index?: number,
                    value?: string
                ) => {
                    console.log('onchange!!!');

                    triggerChange(event, selectedOption, index, value);
                }}
                onItemClick={(
                    event: React.FormEvent<UIComboBoxRef>,
                    selectedOption?: UISelectableOptionWithSubValues,
                    index?: number
                ) => {
                    console.log('onItemClick!!! ' + index);

                    triggerChange(event, selectedOption, index);
                }}
                selectedKey={selectedKey}
                options={convertedOptions}
                onMenuOpen={() => {
                    console.log('onMenuOpen');
                }}
                onMenuDismiss={() => {
                    console.log('onMenuDismiss');
                    setSubMenu(null);
                }}
                calloutProps={{
                    preventDismissOnEvent(event) {
                        console.log('preventDismissOnEvent ' + event.type);
                        let prevent = false;
                        if (event.type === 'focus' || event.type === 'click') {
                            const target = event.target as HTMLElement;
                            prevent = !!(
                                target.closest('.dropdown-submenu') || target.querySelector('.dropdown-submenu')
                            );
                        }
                        console.log('preventDismissOnEvent ' + prevent);
                        return prevent;
                    }
                }}
                onRenderList={(
                    props?: UISelectableOptionWithSubValues,
                    defaultRender?: (props?: UISelectableOptionWithSubValues) => JSX.Element | null
                ) => {
                    return (
                        <div
                            onMouseOver={(event) => {
                                const target = event.target as HTMLElement;
                                const element = target.closest('[data-index]') as HTMLElement;
                                if (element) {
                                    const index = element.getAttribute('data-index');
                                    if (index !== null) {
                                        setSubMenu({
                                            target: element,
                                            option: convertedOptions[parseInt(index)]
                                        });
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
                    console.log(props);
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
                                }}
                                onClick={() => {
                                    setSelectedKey(props.key);
                                }}
                                option={props}
                            />
                        );
                    }
                    return defaultRender?.(props);
                }}
                // onRenderItem={(
                //     props?: IComboBoxExtendsOption,
                //     defaultRender?: (props?: IComboBoxExtendsOption) => JSX.Element | null
                // ) => {
                //     console.log('external onRenderItem');
                //     return defaultRender?.(props);
                // }}
                // onChange={() => {
                //     console.log('change');
                // }}
            />
            {target && activeOption?.options && (
                <UIContextualMenu
                    target={target}
                    className="dropdown-submenu"
                    onRestoreFocus={() => {
                        // No focus restore
                    }}
                    calloutProps={{
                        // popupProps: {
                        //     ref: calloutRef
                        // },
                        onMouseLeave: (event) => {
                            setSubMenu(null);
                        }
                        // onPositioned: (positions) => {
                        //     calloutPosition.current =
                        //         positions?.elementPosition.left ?? positions?.elementPosition.right;
                        // }
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
