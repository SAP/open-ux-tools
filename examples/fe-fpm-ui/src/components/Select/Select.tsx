import React from 'react';
import type { ListQuestion } from 'inquirer';
import { UIComboBox } from '@sap-ux/ui-components';
import type { UIComboBoxOption } from '@sap-ux/ui-components';

// export type SelectProps = ListQuestion;

export interface SelectProps extends ListQuestion {
    answers: Record<string, string | number | undefined>;
    onChoiceRequest: (name: string) => void;
    selectType: 'static' | 'dynamic';
    onChange: (name: string, value: string | number | undefined, dependantPromptNames?: string[]) => void;
    dependantPromptNames?: string[];
}

export const Select = (props: SelectProps) => {
    const { name, choices, onChoiceRequest, message, onChange, selectType, answers, dependantPromptNames } = props;
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
        onChoiceRequest(name ?? '');
    }
    return (
        <UIComboBox
            label={typeof message === 'string' ? message : name}
            options={options}
            highlight={true}
            allowFreeform={true}
            useComboBoxAsMenuMinWidth={true}
            autoComplete="on"
            defaultValue={(name && answers?.[name]) ?? ''}
            // selectedKey={}
            onFocus={() => {
                if (name && selectType === 'dynamic') {
                    onChoiceRequest(name);
                }
            }}
            onChange={(_, option) => {
                if (name) {
                    onChange(name, option?.key, dependantPromptNames);
                }
            }}
        />
    );
};
