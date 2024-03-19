import React, { useEffect } from 'react';
import type { InputQuestion } from 'inquirer';
import { UITextInput } from '@sap-ux/ui-components';
import { useValue, getLabelRenderer } from '../../../utilities';

export interface InputProps extends InputQuestion {
    value?: string | number | boolean;
    onChange: (name: string, value?: string | number | boolean) => void;
    required?: boolean;
    additionalInfo?: string;
}

export const Input = (props: InputProps) => {
    const { name = '', onChange, required, additionalInfo, message } = props;
    const [value, setValue] = useValue('', props.value);
    const onLiveChange = (event: React.FormEvent, newValue?: string | undefined) => {
        setValue(newValue ?? '');
    };
    useEffect(() => {
        const id = setTimeout(() => onChange(name, value), 700);
        return () => clearTimeout(id);
    }, [name, value]);

    return (
        <UITextInput
            onRenderLabel={getLabelRenderer(additionalInfo)}
            required={required}
            label={typeof message === 'string' ? message : name}
            value={value.toString()}
            onChange={onLiveChange}
        />
    );
};
