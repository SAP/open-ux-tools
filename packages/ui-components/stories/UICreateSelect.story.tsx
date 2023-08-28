import React, { useState } from 'react';
import { Text, Stack } from '@fluentui/react';
import type { IStackTokens } from '@fluentui/react';

import { UICreateSelect, UICreateSelectOptionEntry, UICreateSelectMultiValue } from '../src/components/UICreateSelect';
import { UILabel } from '../src/components/UILabel';
import { initIcons } from '../src/components/Icons';

initIcons();

export default { title: 'Dropdowns/CreateSelect' };
const stackTokens: IStackTokens = { childrenGap: 40 };

export const CreateSelect = (): JSX.Element => {
    const createOption = (label: string) => ({
        label,
        value: label.toLowerCase().replace(/\W/g, '')
    });
    const defaultOptions = [createOption('One'), createOption('Two'), createOption('Three')];
    const [isLoading, setIsLoading] = useState(false);
    const [options, setOptions] = useState(defaultOptions);
    const [value, setValue] = useState<UICreateSelectOptionEntry>();
    const [selectedValue, setSelectedValue] = useState<UICreateSelectOptionEntry>();

    const handleCreate = (inputValue: string) => {
        const newOption = createOption(inputValue);
        setIsLoading(true);
        setValue(newOption);

        setTimeout(() => {
            setIsLoading(false);
            setOptions((prev) => [...prev, newOption]);
            setSelectedValue(newOption);
        }, 1000);
    };
    const handleChange = (newValue: UICreateSelectMultiValue<UICreateSelectOptionEntry>) => {
        const val = newValue as unknown as UICreateSelectOptionEntry;
        setValue(val);
        setSelectedValue(val);
    };

    return (
        <div style={{ width: '300px' }}>
            <div>
                <div>
                    <UILabel>UI Create Select</UILabel>
                </div>
                <UICreateSelect
                    createText={'Add new value'}
                    isClearable={true}
                    isLoading={isLoading}
                    isDisabled={false}
                    isValidNewOption={(inputValue) => inputValue.length > 0}
                    placeholder={'Search or enter a new value'}
                    options={options}
                    value={value}
                    handleCreate={handleCreate}
                    handleOnChange={handleChange}
                />
                <div style={{ padding: '20px 0', fontFamily: 'var(--vscode-font-family)', fontSize: '13px' }}>
                    Value selected: <b>{selectedValue?.value}</b>
                </div>
            </div>
        </div>
    );
};
