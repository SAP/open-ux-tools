import React from 'react';
import { Stack } from '@fluentui/react';
import type { IDropdownOption } from '@fluentui/react';
import { UIDropdown } from '../src/components/UIDropdown';
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
    const [selectedKey, setSelectedKey] = React.useState<number | string>('EE');
    const stackTokens = { childrenGap: 40 };
    const testProps = {
        options: data,
        highlight: true,
        allowFreeform: true,
        useComboBoxAsMenuMinWidth: true,
        onChange: (event: React.FormEvent<HTMLDivElement>, option?: IDropdownOption) => {
            if (option) {
                setSelectedKey(option.key);
            }
        }
    };
    return (
        <div>
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
                                minWidth: 100
                            }}></td>
                        <td>Placeholder Text</td>
                        <td>Input Text</td>
                    </tr>
                    <tr>
                        <td>Regular</td>
                        <td>
                            <UIDropdown {...testProps} placeholder="Placeholder"></UIDropdown>
                        </td>
                        <td>
                            <UIDropdown {...testProps} selectedKey={selectedKey}></UIDropdown>
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
                                selectedKey={selectedKey}></UIDropdown>
                        </td>
                    </tr>
                    <tr>
                        <td>Disabled</td>
                        <td>
                            <UIDropdown {...testProps} placeholder="Placeholder" disabled></UIDropdown>
                        </td>
                        <td>
                            <UIDropdown {...testProps} selectedKey={selectedKey} disabled></UIDropdown>
                        </td>
                    </tr>
                    <tr>
                        <td>Read Only</td>
                        <td>
                            <UIDropdown {...testProps} placeholder="Placeholder" readOnly></UIDropdown>
                        </td>
                        <td>
                            <UIDropdown {...testProps} selectedKey={selectedKey} readOnly></UIDropdown>
                        </td>
                    </tr>
                </table>
            </Stack>
        </div>
    );
};
