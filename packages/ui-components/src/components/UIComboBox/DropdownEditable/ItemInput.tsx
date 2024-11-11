import React, { forwardRef, useEffect, useImperativeHandle, useState } from 'react';
import { UITextInput } from '../../UIInput';
import type { UITextInputProps } from '../../UIInput';
import { UISelectableOptionWithSubValues } from './types';
import { useEditValue } from './hooks';

import './ItemInput.scss';
import { UIIcon } from '../../UIIcon';
import { UiIcons } from '../../Icons';

import './ItemInput.scss';

export interface ItemInputProps extends UITextInputProps {
    option?: UISelectableOptionWithSubValues;
    renamedEntry?: string;
    onEnter?: (ev: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
}

export interface ItemInputRef {
    setOption: (option: UISelectableOptionWithSubValues) => void;
}

function getSubValueText(option?: UISelectableOptionWithSubValues): string | undefined {
    return option?.subValue?.text ?? option?.text;
}

function ItemInputComponent(props: ItemInputProps, ref: React.ForwardedRef<ItemInputRef>): React.ReactElement {
    const { option, renamedEntry, onEnter, ...inputProps } = props;
    const { value, onChange, onClick, onMouseDown } = inputProps;
    const [subValue, setSubValue] = useState<string | undefined>(getSubValueText(option));
    const [localValue, setLocalValue] = useEditValue('', value, renamedEntry);
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
    const onKeyDown = (ev: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        if (ev.key === 'Enter') {
            onEnter?.(ev);
        }
    };

    return (
        <div className={`editable-item ${subOptionsCount > 1 ? 'editable-item-expandable' : ''}`}>
            <UITextInput
                className="editable-item-input"
                {...inputProps}
                onMouseDown={(event) => {
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
                onKeyDown={onKeyDown}
                onChange={onLocalChange}
                value={localValue}
            />
            <div className="editable-item-sub-value">{subValue}</div>
            {subOptionsCount > 1 && <UIIcon iconName={UiIcons.Chevron} className="editable-item-sub-menu-icon" />}
        </div>
    );
}
export const ItemInput = forwardRef(ItemInputComponent);

ItemInput.displayName = 'ItemInput';
