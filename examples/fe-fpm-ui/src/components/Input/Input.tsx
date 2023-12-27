import React from 'react';
import type { InputQuestion } from 'inquirer';
import { UITextInput } from '@sap-ux/ui-components';
import { useValue } from '../../utilities';

export interface InputProps extends InputQuestion {
    value?: string | number;
    onChange: (name: string, value?: string | number) => void;
    required?: boolean;
}

export const Input = (props: InputProps) => {
    const { name = '', onChange, required } = props;
    const [value, setValue] = useValue('', props.value);
    const onLiveChange = (event: React.FormEvent, newValue?: string | undefined) => {
        setValue(newValue ?? '');
    };
    const onBlur = () => {
        onChange(name, value);
    };
    return (
        <UITextInput
            required={required}
            label={name}
            value={value.toString()}
            onChange={onLiveChange}
            onBlur={onBlur}
        />
    );
};
