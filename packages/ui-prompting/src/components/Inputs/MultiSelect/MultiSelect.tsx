import React from 'react';
import { UIComboBox, UIComboBoxLoaderType } from '@sap-ux/ui-components';
import { getLabelRenderer, useOptions, useMultiSelectValue, useVisibleOptionsAndKeys } from '../../../utilities';
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
    const { visibleOptions, selectedKeys } = useVisibleOptionsAndKeys(options, value);

    return (
        <UIComboBox
            label={typeof message === 'string' ? message : name}
            options={visibleOptions}
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

                let updatedValue: string | undefined = '';
                if (changedOption.selected) {
                    updatedValue = [...(value?.split(',').filter((option) => option) ?? []), changedOption.key].join();
                } else {
                    updatedValue = (value?.split(',') ?? [])
                        .filter((option) => option && option !== changedOption.key)
                        .join();
                }
                setValue(updatedValue);
                onChange(name, updatedValue);
            }}
            onRenderLabel={getLabelRenderer(hint)}
            errorMessage={errorMessage}
            placeholder={placeholder}
            id={id}
            calloutCollisionTransformation={true}
        />
    );
};
