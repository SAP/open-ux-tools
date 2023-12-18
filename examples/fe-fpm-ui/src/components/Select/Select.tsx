import React from 'react';
import type { ListQuestion } from 'inquirer';
import { UIComboBox } from '@sap-ux/ui-components';
import type { UIComboBoxOption } from '@sap-ux/ui-components';

export type SelectProps = ListQuestion;

export const Select = (props: SelectProps) => {
    const { name, choices } = props;
    let options: UIComboBoxOption[] = [];
    if (Array.isArray(choices)) {
        options =
            choices?.map((choice) => {
                const { name, value } = choice;
                return {
                    key: typeof name === 'string' ? name : '',
                    text: typeof value === 'string' ? value : ''
                };
            }) ?? [];
    }
    return (
        <UIComboBox
            label={name}
            options={options}
            highlight={true}
            allowFreeform={true}
            useComboBoxAsMenuMinWidth={true}
            autoComplete="on"
        />
    );
};
