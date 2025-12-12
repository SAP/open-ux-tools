import React, { useEffect } from 'react';
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
    const options = useOptions(props, dynamicChoices);
    console.log('---dynamicChoices', dynamicChoices)

    /**
     * Gets the default value from options with checked: true.
     * 
     * @returns Comma-separated string of checked option values
     */
    const getDefaultValue = (): string => {
        if (props.value !== undefined) {
            return props.value.toString();
        }
        
        // Find all options with checked: true from their data
        const checkedValues = options
            .filter((opt) => opt.data && 'checked' in opt.data && opt.data.checked === true)
            .map((opt) => opt.data?.value ?? opt.key);
        
        return checkedValues.join(',');
    };

    const [value, setValue] = useValue('', getDefaultValue());

    /**
     * Update value when options change (for dynamic choices with checked state).
     * This handles the case where dynamic choices load with pre-checked items.
     */
    useEffect(() => {
        const defaultValue = getDefaultValue();
        if (defaultValue && defaultValue !== value) {
            setValue(defaultValue);
            onChange(name, defaultValue);
        }
    }, [options]); // Re-run when options change

    const selectedKeys = value?.split(',').filter((v) => v) ?? [];

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
            onChange={(_, changedOption) => {
                if (!changedOption) {
                    return;
                }

                // Use data.value like Select component does (not key)
                const optionValue = changedOption.data?.value ?? changedOption.key;
                const currentValues = value?.split(',').filter((v) => v) ?? [];
                
                let updatedValue: string;
                if (changedOption.selected) {
                    // Add value if not already present
                    updatedValue = currentValues.includes(optionValue)
                        ? currentValues.join(',')
                        : [...currentValues, optionValue].join(',');
                } else {
                    // Remove value
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
