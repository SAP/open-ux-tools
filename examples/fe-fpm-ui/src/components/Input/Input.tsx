import React from 'react';
import type { InputQuestion } from 'inquirer';
import { UITextInput } from '@sap-ux/ui-components';
import { useValue } from '../../utilities';

export interface InputProps extends InputQuestion {
    value?: string | number;
}

export const Input = (props: InputProps) => {
    const { name } = props;
    const [value, setValue] = useValue('', props.value);
    const onChange = (
        event: React.FormEvent<HTMLInputElement | HTMLTextAreaElement>,
        newValue?: string | undefined
    ) => {
        console.log(`change - ${newValue}`);
        setValue(newValue ?? '');
    };
    return <UITextInput label={name} value={value.toString()} onChange={onChange} />;
};
