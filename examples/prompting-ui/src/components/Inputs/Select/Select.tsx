import React from 'react';
import type { ListQuestion } from 'inquirer';
import { UIComboBox, UIComboBoxLoaderType } from '@sap-ux/ui-components';
import type { UIComboBoxOption } from '@sap-ux/ui-components';
import { useValue, getLabelRenderer } from '../../../utilities';

export interface SelectProps extends ListQuestion {
    value?: string | number | boolean;
    selectType: 'static' | 'dynamic';
    onChange: (name: string, value: string | number | undefined, dependantPromptNames?: string[]) => void;
    dependantPromptNames?: string[];
    required?: boolean;
    options: UIComboBoxOption[];
    pending?: boolean;
    additionalInfo?: string;
    errorMessage?: string;
}

export const Select = (props: SelectProps) => {
    const {
        name = '',
        message,
        onChange,
        dependantPromptNames,
        required,
        options,
        pending,
        additionalInfo,
        errorMessage
    } = props;
    const [value, setValue] = useValue('', props.value);

    return (
        <UIComboBox
            label={typeof message === 'string' ? message : name}
            options={options}
            highlight={true}
            allowFreeform={true}
            useComboBoxAsMenuMinWidth={true}
            autoComplete="on"
            required={required}
            isLoading={pending ? [UIComboBoxLoaderType.Input, UIComboBoxLoaderType.List] : undefined}
            selectedKey={value.toString()}
            disabled={false}
            onChange={(_, option) => {
                setValue(option?.key ?? '');
                if (name) {
                    // ToDo - avoid any? -> option?.data.value
                    onChange(name, option?.data.value, dependantPromptNames);
                }
            }}
            onRenderLabel={getLabelRenderer(additionalInfo)}
            errorMessage={errorMessage}
        />
    );
};
