import React from 'react';
import type { ListQuestion } from 'inquirer';
import { UIComboBox } from '@sap-ux/ui-components';
import type { UIComboBoxOption } from '@sap-ux/ui-components';

// export type SelectProps = ListQuestion;

export interface SelectProps extends ListQuestion {
    onChoiceRequest: () => void;
}

export const Select = (props: SelectProps) => {
    const { name, choices, onChoiceRequest, message } = props;
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
        onChoiceRequest();
    }
    return (
        <UIComboBox
            label={typeof message === 'string' ? message : name}
            options={options}
            highlight={true}
            allowFreeform={true}
            useComboBoxAsMenuMinWidth={true}
            autoComplete="on"
        />
    );
};
