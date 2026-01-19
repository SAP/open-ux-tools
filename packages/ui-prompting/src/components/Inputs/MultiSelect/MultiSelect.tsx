import React from 'react';
import { UIComboBox, UIComboBoxLoaderType } from '@sap-ux/ui-components';
import { useValue, getLabelRenderer, useOptions, useMultiSelectKeys } from '../../../utilities';
import type { AnswerValue, CheckboxPromptQuestion, PromptListChoices } from '../../../types';

export interface MultiSelectProps extends CheckboxPromptQuestion {
    id?: string;
    value?: AnswerValue;
    onChange: (name: string, value: AnswerValue) => void;
    dynamicChoices?: PromptListChoices;
    pending?: boolean;
    errorMessage?: string;
    calloutCollisionTransformation?: boolean;
}

export const MultiSelect = (props: MultiSelectProps) => {
    const {
        name,
        message,
        onChange,
        guiOptions = {},
        pending,
        errorMessage,
        dynamicChoices,
        id,
        calloutCollisionTransformation
    } = props;
    const { mandatory, hint, placeholder } = guiOptions;
    const [value, setValue] = useValue('', props.value?.toString() ?? '');
    const options = useOptions(props, dynamicChoices);
    const { checkedOptions, selectedKeys } = useMultiSelectKeys(options, value ?? '');

    const handleSubmitValue = (value: string): string => {
        const currentSelectedOptions =
            value
                ?.split(',')
                .map((v) => v.trim())
                .filter(Boolean) ?? [];
        const allSelectedOptions = new Set([...currentSelectedOptions, ...checkedOptions]);
        return Array.from(allSelectedOptions).join(',');
    };

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
            selectedKey={selectedKeys}
            multiSelect
            disabled={false}
            calloutCollisionTransformation={calloutCollisionTransformation}
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
                onChange(name, handleSubmitValue(updatedValue));
            }}
            onRenderLabel={getLabelRenderer(hint)}
            errorMessage={errorMessage}
            placeholder={placeholder}
            id={id}
        />
    );
};
