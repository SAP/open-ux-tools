import type { UIComboBoxOption } from '@sap-ux/ui-components';
import { UIComboBox } from '@sap-ux/ui-components';
import type { CheckboxQuestion } from 'inquirer';
import React from 'react';
import { useValue } from '../../utilities';

export interface MultiSelectProps extends CheckboxQuestion {
    value?: string | number;
    selectType: 'static' | 'dynamic';
    onChange: (name: string, value: string | number | undefined, dependantPromptNames?: string[]) => void;
    dependantPromptNames?: string[];
    required?: boolean;
    type: 'checkbox';
    options: UIComboBoxOption[];
}

export const MultiSelect = (props: MultiSelectProps) => {
    const { name = '', message, onChange, dependantPromptNames, required, options } = props;
    const [value, setValue] = useValue('', props.value?.toString());

    return (
        <UIComboBox
            label={typeof message === 'string' ? message : name}
            options={options}
            highlight={true}
            allowFreeform={true}
            useComboBoxAsMenuMinWidth={true}
            autoComplete="on"
            required={required}
            selectedKey={value?.split(',').map((v) => v.trim())}
            multiSelect
            onChange={(_, option) => {
                let updatedValue: string | undefined;
                if (option?.selected) {
                    const selectedKeyz = value.split(',').filter((str) => !!str) ?? [];
                    selectedKeyz.push(option.key.toString());
                    updatedValue = selectedKeyz.join(',');
                } else {
                    updatedValue = (value.split(',') ?? [])
                        .filter((str) => str.includes(option?.key?.toString() ?? ''))
                        .join(', ');
                }
                setValue(updatedValue);
                onChange(name, value, dependantPromptNames);
            }}
        />
    );
};
