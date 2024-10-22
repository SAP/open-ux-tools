import React, { forwardRef, useEffect, useImperativeHandle, useState } from 'react';
import type { ReactElement } from 'react';
import { UITextInput } from '../../UIInput';
import type { UITextInputProps } from '../../UIInput';
import { UIContextualMenuItem } from '../../UIContextualMenu';
import { UISelectableOptionWithSubValues } from './types';
import { RenamedEntry } from './utils';
import { useEditValue } from './hooks';

import './ItemInput.scss';
import { UIIcon } from '../../UIIcon';
import { UiIcons } from '../../Icons';

export interface ItemInputProps extends UITextInputProps {
    option?: UISelectableOptionWithSubValues;
    renamedEntry?: string;
}

export interface ItemInputRef {
    setOption: (option: UISelectableOptionWithSubValues) => void;
}

function getSubValueText(option?: UISelectableOptionWithSubValues): string | undefined {
    return option?.subValue?.text ?? option?.text;
}

function ItemInputComponent(props: ItemInputProps, ref: React.ForwardedRef<ItemInputRef>): React.ReactElement {
    const { option, renamedEntry, ...inputProps } = props;
    const { value, onChange, onClick, onMouseDown } = inputProps;
    const [subValue, setSubValue] = useState<string | undefined>(getSubValueText(option));
    const [localValue, placeholder, setLocalValue] = useEditValue('', value, renamedEntry);
    const subOptionsCount = option?.options?.length ?? 0;

    useImperativeHandle<ItemInputRef, ItemInputRef>(ref, () => ({
        setOption: (option: UISelectableOptionWithSubValues) => {
            setSubValue(getSubValueText(option));
        }
    }));

    useEffect(() => {
        setSubValue(getSubValueText(option));
    }, [option]);

    const onLocalChange = (event: React.FormEvent<HTMLInputElement | HTMLTextAreaElement>, newValue?: string) => {
        setLocalValue(newValue ?? '');
        onChange?.(event, newValue);
    };

    return (
        <div className="editable-item">
            <UITextInput
                className="editable-item-input"
                {...inputProps}
                onMouseDown={(event) => {
                    console.log('mouse down!!');
                    const target = event.target as HTMLElement;
                    (document.activeElement as HTMLElement)?.blur();
                    target.focus();
                    event.stopPropagation();
                    onMouseDown?.(event);
                }}
                onClick={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    onClick?.(event);
                }}
                onChange={onLocalChange}
                placeholder={placeholder}
                value={!placeholder ? localValue : ''}
            />
            <div className="editable-item-sub-value">{subValue}</div>
            {subOptionsCount > 1 && <UIIcon iconName={UiIcons.Chevron} className="editable-item-sub-menu-icon" />}
        </div>
    );
}
export const ItemInput = forwardRef(ItemInputComponent);

ItemInput.displayName = 'ItemInput';
