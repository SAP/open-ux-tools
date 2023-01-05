import React from 'react';
import { Stack } from '@fluentui/react';
import type { IDropdownOption } from '@fluentui/react';
import { UIDropdown } from '../src/components/UIDropdown';
import { UICheckbox } from '../src/components/UICheckbox';
import { data, shortData } from '../test/__mock__/select-data';

import { initIcons } from '../src/components/Icons';

initIcons();

export default { title: 'Dropdowns/Dropdown' };

export const Basic = (): JSX.Element => (
    <div style={{ width: '300px' }}>
        <UIDropdown options={data} useDropdownAsMenuMinWidth={true} />
    </div>
);

export const Short = (): JSX.Element => (
    <div style={{ width: '150px' }}>
        <UIDropdown options={shortData} />
        <UIDropdown options={shortData} disabled={true} />
    </div>
);

export const States = (): JSX.Element => (
    <div style={{ width: '300px' }}>
        <UIDropdown options={data} label="Error" errorMessage="Dummy Error" />
        <UIDropdown options={data} label="Disabled" disabled={true} />
        <UIDropdown options={data} label="Required" required={true} />
    </div>
);

export const MultiSelectDropdown = (): JSX.Element => (
    <div style={{ width: '300px' }}>
        <UIDropdown options={data} multiSelect responsiveMode={5} />
    </div>
);

export const Messages = (): JSX.Element => (
    <div style={{ width: '300px' }}>
        <UIDropdown options={data} label="Error" errorMessage="Dummy Error" />
        <UIDropdown options={data} label="Warning" warningMessage="Dummy Warning" />
        <UIDropdown options={data} label="Info" infoMessage="Dummy Info" />
    </div>
);

export const UseDropdownAsMenuMinWidth = (): JSX.Element => (
    <div style={{ width: '300px' }}>
        <div>
            <div>useDropdownAsMenuMinWidth ON</div>
            <UIDropdown label="Long" options={data} useDropdownAsMenuMinWidth={true} />
            <UIDropdown label="Short" options={shortData} useDropdownAsMenuMinWidth={true} />
        </div>
        <div>
            <div>useDropdownAsMenuMinWidth OFF</div>
            <UIDropdown label="Long" options={data} />
            <UIDropdown label="Short" options={shortData} />
        </div>
    </div>
);

export const accessibilityStates = () => {
    const [multiSelect, setMultiSelect] = React.useState(false);
    const [selectedKey, setSelectedKey] = React.useState<number | string | number[] | string[]>('EE');
    const stackTokens = { childrenGap: 40 };
    const selectedKeys = Array.isArray(selectedKey) ? selectedKey : undefined;
    const testProps = {
        options: data,
        highlight: true,
        allowFreeform: true,
        useComboBoxAsMenuMinWidth: true,
        multiSelect,
        onChange: (event: React.FormEvent<HTMLDivElement>, option?: IDropdownOption) => {
            console.log('aaaaaaaa');
            if (Array.isArray(selectedKey)) {
                const newKeys = [...selectedKey, option?.key].filter((k) =>
                    option?.selected ? true : k !== option?.key
                ) as string[];
                setSelectedKey(newKeys);
            } else if (option) {
                setSelectedKey(option.key);
            }
        }
    };
    return (
        <div>
            <UICheckbox
                label="Multi Select"
                checked={multiSelect}
                onChange={(event: any, value: any) => {
                    if (value && !Array.isArray(selectedKey)) {
                        setSelectedKey([selectedKey as string]);
                    } else if (!value && Array.isArray(selectedKey)) {
                        setSelectedKey(selectedKey[0]);
                    }
                    setMultiSelect(value);
                }}
            />
            <Stack horizontal tokens={stackTokens}>
                <table
                    style={{
                        borderSpacing: 20,
                        width: '100%',
                        maxWidth: 750
                    }}>
                    <tr>
                        <td
                            style={{
                                minWidth: 100,
                                width: 150
                            }}></td>
                        <td
                            style={{
                                width: '50%'
                            }}>
                            Placeholder Text
                        </td>
                        <td
                            style={{
                                width: '50%'
                            }}>
                            Input Text
                        </td>
                    </tr>
                    <tr>
                        <td>Regular</td>
                        <td>
                            <UIDropdown {...testProps} placeholder="Placeholder"></UIDropdown>
                        </td>
                        <td>
                            <UIDropdown
                                {...testProps}
                                selectedKey={selectedKey}
                                selectedKeys={selectedKeys}></UIDropdown>
                        </td>
                    </tr>
                    <tr>
                        <td>Error</td>
                        <td>
                            <UIDropdown
                                {...testProps}
                                placeholder="Placeholder"
                                errorMessage="Dummy error"></UIDropdown>
                        </td>
                        <td>
                            <UIDropdown
                                {...testProps}
                                errorMessage="Dummy error"
                                selectedKey={selectedKey}
                                selectedKeys={selectedKeys}></UIDropdown>
                        </td>
                    </tr>
                    <tr>
                        <td>Disabled</td>
                        <td>
                            <UIDropdown {...testProps} placeholder="Placeholder" disabled></UIDropdown>
                        </td>
                        <td>
                            <UIDropdown
                                {...testProps}
                                selectedKey={selectedKey}
                                selectedKeys={selectedKeys}
                                disabled></UIDropdown>
                        </td>
                    </tr>
                    <tr>
                        <td>Read Only</td>
                        <td>
                            <UIDropdown {...testProps} placeholder="Placeholder" readOnly></UIDropdown>
                        </td>
                        <td>
                            <UIDropdown
                                {...testProps}
                                selectedKey={selectedKey}
                                selectedKeys={selectedKeys}
                                readOnly></UIDropdown>
                        </td>
                    </tr>
                </table>
            </Stack>
        </div>
    );
};
