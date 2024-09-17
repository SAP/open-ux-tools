import React from 'react';
import { UIComboBox, UIComboBoxLoaderType } from '@sap-ux/ui-components';
import { useValue, getLabelRenderer, useOptions } from '../../../utilities';
import type { AnswerValue, CheckboxPromptQuestion, PromptListChoices } from '../../../types';

export interface MultiSelectProps extends CheckboxPromptQuestion {
    id?: string;
    value?: AnswerValue;
    onChange: (name: string, value: AnswerValue) => void;
    dynamicChoices?: PromptListChoices;
    pending?: boolean;
    errorMessage?: string;
}

export const MultiSelect = (props: MultiSelectProps) => {
    const { name, message, onChange, guiOptions = {}, pending, errorMessage, dynamicChoices, id } = props;
    const { mandatory, hint, placeholder } = guiOptions;
    const [value, setValue] = useValue('', props.value?.toString() ?? '');
    const options = useOptions(props, dynamicChoices);

    return (
        <UIComboBox
            label={typeof message === 'string' ? message : name}
            options={options}
            highlight={true}
            allowFreeform={true}
            useComboBoxAsMenuMinWidth={true}
            autoComplete="on"
            required={mandatory}
            isLoading={pending ? [UIComboBoxLoaderType.Input, UIComboBoxLoaderType.List] : undefined}
            selectedKey={value?.split(',').map((v) => v.trim())}
            multiSelect
            disabled={false}
            onChange={(_, changedOption) => {
                let updatedValue: string | undefined = '';
                if (changedOption?.selected) {
                    updatedValue = [...(value?.split(',').filter((option) => option) ?? []), changedOption.key].join();
                } else {
                    updatedValue = (value?.split(',') ?? [])
                        .filter((option) => option && option !== changedOption?.key)
                        .join();
                }
                setValue(updatedValue);
                onChange(name, updatedValue);
            }}
            onRenderLabel={getLabelRenderer(hint)}
            errorMessage={errorMessage}
            placeholder={placeholder}
            id={id}
        />
    );
};
