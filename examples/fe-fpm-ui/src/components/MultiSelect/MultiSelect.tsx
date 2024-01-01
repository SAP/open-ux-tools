import type { UIComboBoxOption } from '@sap-ux/ui-components';
import { UIComboBox } from '@sap-ux/ui-components';
import type { CheckboxQuestion } from 'inquirer';
import React, { useEffect, useState } from 'react';

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
    const [value, setValue] = useState(props.value?.toString());
    useEffect(() => {
        onChange(name, value, dependantPromptNames);
    }, [value]);

    return (
        <UIComboBox
            label={typeof message === 'string' ? message : name}
            options={options}
            highlight={true}
            allowFreeform={true}
            useComboBoxAsMenuMinWidth={true}
            autoComplete="on"
            required={required}
            defaultSelectedKey={value?.split(',').map((v) => v.trim())}
            multiSelect
            onChange={(_, option) => {
                setValue((v) => {
                    if (option?.selected) {
                        const selectedKeyz = v?.split(',').filter((str) => !!str) ?? [];
                        selectedKeyz.push(option.key.toString());
                        return selectedKeyz.join(',');
                    } else {
                        return (v?.split(',') ?? [])
                            .filter((str) => str.includes(option?.key?.toString() ?? ''))
                            .join(', ');
                    }
                });
            }}
        />
    );
};
