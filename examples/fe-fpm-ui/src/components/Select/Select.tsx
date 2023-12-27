import React from 'react';
import type { ListQuestion } from 'inquirer';
import { UIComboBox } from '@sap-ux/ui-components';
import type { UIComboBoxOption } from '@sap-ux/ui-components';
import { useValue } from '../../utilities';

export interface SelectProps extends ListQuestion {
    value?: string | number;
    onChoiceRequest: (name: string) => void;
    selectType: 'static' | 'dynamic';
    onChange: (name: string, value: string | number | undefined, dependantPromptNames?: string[]) => void;
    dependantPromptNames?: string[];
    required?: boolean;
}

export const Select = (props: SelectProps) => {
    const { name = '', choices, onChoiceRequest, message, onChange, dependantPromptNames, required } = props;
    const [value, setValue] = useValue('', props.value);
    let options: UIComboBoxOption[] = [];

    if (Array.isArray(choices)) {
        options =
            choices?.map((choice) => {
                const { name, value } = choice;
                return {
                    key: value,
                    text: typeof name === 'string' ? name : ''
                };
            }) ?? [];
    } else {
        onChoiceRequest(name);
    }
    return (
        <UIComboBox
            label={typeof message === 'string' ? message : name}
            options={options}
            highlight={true}
            allowFreeform={true}
            useComboBoxAsMenuMinWidth={true}
            autoComplete="on"
            required={required}
            selectedKey={value}
            onChange={(_, option) => {
                setValue(option?.key ?? '');
                if (name) {
                    onChange(name, option?.key, dependantPromptNames);
                }
            }}
        />
    );
};
