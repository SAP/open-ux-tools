import React, { useEffect } from 'react';
import { UITextInput } from '@sap-ux/ui-components';
import { useValue, getLabelRenderer } from '../../../utilities';
import type { AnswerValue, InputPromptQuestion } from '../../../types';

export interface InputProps extends InputPromptQuestion {
    value?: AnswerValue;
    onChange?: (name: string, value?: AnswerValue) => void;
    errorMessage?: string;
}

export const Input = (props: InputProps) => {
    const { name, onChange, required, description, message, errorMessage, placeholder } = props;
    const [value, setValue] = useValue('', props.value);
    const onLiveChange = (event: React.FormEvent, newValue?: string | undefined) => {
        setValue(newValue ?? '');
    };

    useEffect(() => {
        onChange?.(name, value);
    }, [name, value]);

    return (
        <UITextInput
            onRenderLabel={getLabelRenderer(description)}
            required={required}
            label={typeof message === 'string' ? message : name}
            value={value.toString()}
            onChange={onLiveChange}
            errorMessage={errorMessage}
            placeholder={placeholder ?? 'Enter a value'}
        />
    );
};
