import React from 'react';
import { UITextInput } from '@sap-ux/ui-components';
import { useValue, getLabelRenderer } from '../../../utilities';
import type { AnswerValue, InputPromptQuestion } from '../../../types';

export interface InputProps extends InputPromptQuestion {
    id?: string;
    value?: AnswerValue;
    onChange?: (name: string, value?: AnswerValue) => void;
    errorMessage?: string;
}

export const Input = (props: InputProps) => {
    const { name, onChange, guiOptions = {}, message, errorMessage, id } = props;
    const { mandatory, hint, placeholder } = guiOptions;
    const [value, setValue] = useValue('', props.value);
    const onLiveChange = (event: React.FormEvent, newValue?: string | undefined) => {
        setValue(newValue ?? '');
        onChange?.(name, newValue);
    };

    return (
        <UITextInput
            onRenderLabel={getLabelRenderer(hint)}
            required={mandatory}
            label={typeof message === 'string' ? message : name}
            value={value ? value.toString() : ''}
            onChange={onLiveChange}
            errorMessage={errorMessage}
            placeholder={placeholder ?? 'Enter a value'}
            id={id}
        />
    );
};
