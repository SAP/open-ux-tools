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
    const createOption = (label: string): UICreateSelectOptionEntry => ({
        label,
        value: label.toLowerCase().replace(/\W/g, '')
    });
    const defaultOptions = [createOption('One'), createOption('Two'), createOption('Three')];
    const [isLoading, setIsLoading] = useState(false);
    const [options, setOptions] = useState(defaultOptions);
    const [value, setValue] = useState<UICreateSelectOptionEntry>();
    const [selectedValue, setSelectedValue] = useState<UICreateSelectOptionEntry>();

    const [isLoadingEmpty, setIsLoadingEmpty] = useState(false);
    const [optionsEmpty, setOptionsEmpty] = useState<UICreateSelectOptionEntry[]>([]);
    const [valueEmpty, setValueEmpty] = useState<UICreateSelectOptionEntry>();
    const [selectedValueEmpty, setSelectedValueEmpty] = useState<UICreateSelectOptionEntry>();

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

    const handleCreateEmpty = (inputValue: string) => {
        const newOption = createOption(inputValue);
        setIsLoadingEmpty(true);
        setValueEmpty(newOption);

        setTimeout(() => {
            setIsLoadingEmpty(false);
            setOptionsEmpty((prev) => [...prev, newOption]);
            setSelectedValueEmpty(newOption);
        }, 1000);
    };
    const handleChangeEmpty = (newValue: UICreateSelectMultiValue<UICreateSelectOptionEntry>) => {
        const val = newValue as unknown as UICreateSelectOptionEntry;
        setValueEmpty(val);
        setSelectedValueEmpty(val);
    };

    const generateNoOptionsMessage = (_obj: { inputValue: string }): React.ReactNode => {
        return (
            <div style={{ fontSize: '12px', display: 'flex', margin: '5px', padding: '0px 5px 0px 5px' }}>
                Nothing there, just create new ones...
            </div>
        );
    };

    return (
        <Stack tokens={stackTokens}>
            <Stack tokens={stackTokens}>
                <Text variant={'large'} block>
                    Create Select - default
                </Text>
                <Stack horizontal tokens={stackTokens} style={{ margin: 0, padding: 0 }}>
                    <div style={{ width: '300px' }}>
                        <div>
                            <div>
                                <UILabel>UI Create Select Label</UILabel>
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
                            <div
                                style={{
                                    padding: '20px 0',
                                    fontFamily: 'var(--vscode-font-family)',
                                    fontSize: '13px'
                                }}>
                                Value selected: <b>{selectedValue?.value}</b>
                            </div>
                        </div>
                    </div>
                </Stack>

                <Text variant={'large'} block>
                    Create Select - no option by default
                </Text>
                <Stack horizontal tokens={stackTokens} style={{ margin: 0, padding: 0 }}>
                    <div style={{ width: '300px' }}>
                        <div>
                            <div>
                                <UILabel>UI Create Select Label</UILabel>
                            </div>
                            <UICreateSelect
                                createText={'Add new qualifier'}
                                isClearable={true}
                                isLoading={isLoadingEmpty}
                                isDisabled={false}
                                isValidNewOption={(inputValue) => inputValue.length > 0}
                                placeholder={'Search or enter a new qualifier value'}
                                options={optionsEmpty}
                                value={valueEmpty}
                                noOptionsMessage={generateNoOptionsMessage}
                                handleCreate={handleCreateEmpty}
                                handleOnChange={handleChangeEmpty}
                            />
                            <div
                                style={{
                                    padding: '20px 0',
                                    fontFamily: 'var(--vscode-font-family)',
                                    fontSize: '13px'
                                }}>
                                Value selected: <b>{selectedValue?.value}</b>
                            </div>
                        </div>
                    </div>
                </Stack>
            </Stack>
        </Stack>
    );
};
