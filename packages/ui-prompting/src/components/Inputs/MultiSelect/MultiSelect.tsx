import React from 'react';
import { UIComboBox, UIComboBoxLoaderType } from '@sap-ux/ui-components';
import { getLabelRenderer, useOptions, useMultiSelectValue } from '../../../utilities';
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
    const options = useOptions(props, dynamicChoices);
    const [value, setValue] = useMultiSelectValue(props, options);

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
                if (!changedOption) {
                    return;
                }

                const optionValue = changedOption.data?.value ?? changedOption.key;
                const currentValues = value?.split(',').filter((v) => v) ?? [];
                // If the option was selected, add it to the list if not already present.
                // If the option was unselected, remove it from the list.
                if (changedOption.selected) {
                    // Add value if not already present
                    updatedValue = currentValues.includes(optionValue)
                        ? currentValues.join(',')
                        : [...currentValues, optionValue].join(',');
                } else {
                    // Remove value if it was unselected
                    updatedValue = currentValues.filter((v) => v !== optionValue).join(',');
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
