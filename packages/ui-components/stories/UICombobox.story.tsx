import type { SetStateAction } from 'react';
import React, { useState } from 'react';
import { Stack } from '@fluentui/react';
import type { IComboBox, IComboBoxOption } from '@fluentui/react';

import { UIComboBox, UIComboBoxLoaderType, UISelectableOptionMenuItemType } from '../src/components/UIComboBox';
import { UICheckbox } from '../src/components/UICheckbox';
import { data, groupsData } from '../test/__mock__/select-data';

import { initIcons } from '../src/components/Icons';

initIcons();

export default { title: 'Dropdowns/Combobox' };

export const SearchHighlight = (): JSX.Element => (
    <div style={{ width: '300px' }}>
        <UIComboBox
            options={data}
            highlight={true}
            allowFreeform={true}
            useComboBoxAsMenuMinWidth={true}
            autoComplete="on"
        />
        <UIComboBox
            options={data}
            highlight={true}
            allowFreeform={true}
            useComboBoxAsMenuMinWidth={true}
            autoComplete="on"
            disabled={true}
        />
    </div>
);

export const SearchWithoutHighlight = (): JSX.Element => (
    <div style={{ width: '300px' }}>
        <UIComboBox
            options={data}
            dropdownWidth={300}
            placeholder="Search"
            allowFreeform={true}
            autoComplete="on"
            openOnKeyboardFocus={true}
        />
    </div>
);

export const WithoutSearch = (): JSX.Element => (
    <div style={{ width: '300px' }}>
        <UIComboBox options={data} dropdownWidth={300} />
    </div>
);

export const WithRefresh = (): JSX.Element => (
    <div style={{ width: '300px' }}>
        <UIComboBox options={data} onRefresh={() => console.log('refresh trigged!')} />
        <small>*watch console</small>
    </div>
);

export const WithLoading = (): JSX.Element => (
    <div style={{ width: '300px' }}>
        <UIComboBox
            options={data}
            isLoading={true}
            styles={{ optionsContainerWrapper: { width: '262px' } }}
            label="Default"
        />
        <UIComboBox
            options={data}
            isLoading={[UIComboBoxLoaderType.List]}
            styles={{ optionsContainerWrapper: { width: '262px' } }}
            label="List"
        />
        <UIComboBox
            options={data}
            isLoading={[UIComboBoxLoaderType.Input]}
            styles={{ optionsContainerWrapper: { width: '262px' } }}
            label="Input"
        />
        <UIComboBox
            options={data}
            isLoading={[UIComboBoxLoaderType.List, UIComboBoxLoaderType.Input]}
            styles={{ optionsContainerWrapper: { width: '262px' } }}
            label="List and Input"
        />
    </div>
);

export const DifferentStates = (): JSX.Element => (
    <div style={{ width: '300px' }}>
        <UIComboBox
            options={data}
            label="Error"
            highlight={true}
            allowFreeform={true}
            useComboBoxAsMenuMinWidth={true}
            autoComplete="on"
            errorMessage="Dummy Error"
        />
        <UIComboBox
            options={data}
            label="Disabled"
            highlight={true}
            allowFreeform={true}
            useComboBoxAsMenuMinWidth={true}
            autoComplete="on"
            disabled={true}
        />
        <UIComboBox
            options={data}
            label="Required"
            highlight={true}
            allowFreeform={true}
            useComboBoxAsMenuMinWidth={true}
            autoComplete="on"
            required={true}
        />
    </div>
);

export const MultiSelectSearchHighlight = (): JSX.Element => {
    const [keys, setKeys] = useState([]);

    function onCbChange(
        event: React.FormEvent<IComboBox>,
        option?: IComboBoxOption | undefined,
        index?: number | undefined,
        value?: string | undefined
    ) {
        if (option) {
            const newKeys = [...keys, option.key].filter((k) => (option.selected ? true : k !== option.key));
            setKeys(newKeys as SetStateAction<any[]>);
        }
    }

    return (
        <div style={{ width: '300px' }}>
            <UIComboBox
                options={data}
                selectedKey={keys}
                onChange={onCbChange}
                highlight={true}
                allowFreeform={true}
                useComboBoxAsMenuMinWidth={true}
                multiSelect={true}
                autoComplete="on"
            />
        </div>
    );
};

export const Messages = (): JSX.Element => (
    <div style={{ width: '300px' }}>
        <UIComboBox
            options={data}
            label="Error"
            highlight={true}
            allowFreeform={true}
            useComboBoxAsMenuMinWidth={true}
            autoComplete="on"
            errorMessage="Dummy Error"
        />
        <UIComboBox
            options={data}
            label="Error"
            highlight={true}
            allowFreeform={true}
            useComboBoxAsMenuMinWidth={true}
            autoComplete="on"
            warningMessage="Dummy Warning"
        />
        <UIComboBox
            options={data}
            label="Error"
            highlight={true}
            allowFreeform={true}
            useComboBoxAsMenuMinWidth={true}
            autoComplete="on"
            infoMessage="Dummy Info"
        />
    </div>
);

export const openMenuOnClick = (): JSX.Element => (
    <div style={{ width: '300px' }}>
        <UIComboBox
            options={data}
            highlight={true}
            allowFreeform={true}
            useComboBoxAsMenuMinWidth={true}
            autoComplete="on"
            openMenuOnClick={true}
            label="Open menu on click"
        />
        <UIComboBox
            options={data}
            highlight={true}
            allowFreeform={true}
            useComboBoxAsMenuMinWidth={true}
            autoComplete="on"
            openMenuOnClick={false}
            label="Do not open menu on click"
        />
    </div>
);

export const accessibilityStates = () => {
    const [multiSelect, setMultiSelect] = React.useState(false);
    const [selectedKey, setSelectedKey] = React.useState<number | string | number[] | string[]>('EE');
    const stackTokens = { childrenGap: 40 };
    const testProps = {
        options: data,
        highlight: true,
        allowFreeform: true,
        useComboBoxAsMenuMinWidth: true,
        multiSelect,
        onChange: (event: React.FormEvent<IComboBox>, option?: IComboBoxOption | undefined) => {
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
            <Stack horizontal tokens={stackTokens}>
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
            </Stack>
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
                            <UIComboBox {...testProps} placeholder="Placeholder"></UIComboBox>
                        </td>
                        <td>
                            <UIComboBox {...testProps} selectedKey={selectedKey}></UIComboBox>
                        </td>
                    </tr>
                    <tr>
                        <td>Error</td>
                        <td>
                            <UIComboBox
                                {...testProps}
                                placeholder="Placeholder"
                                errorMessage="Dummy error"></UIComboBox>
                        </td>
                        <td>
                            <UIComboBox
                                {...testProps}
                                errorMessage="Dummy error"
                                selectedKey={selectedKey}></UIComboBox>
                        </td>
                    </tr>
                    <tr>
                        <td>Disabled</td>
                        <td>
                            <UIComboBox {...testProps} placeholder="Placeholder" disabled></UIComboBox>
                        </td>
                        <td>
                            <UIComboBox {...testProps} selectedKey={selectedKey} disabled></UIComboBox>
                        </td>
                    </tr>
                    <tr>
                        <td>Read Only</td>
                        <td>
                            <UIComboBox {...testProps} placeholder="Placeholder" readOnly></UIComboBox>
                        </td>
                        <td>
                            <UIComboBox {...testProps} selectedKey={selectedKey} readOnly></UIComboBox>
                        </td>
                    </tr>
                </table>
            </Stack>
        </div>
    );
};

export const groupsAndSeparators = () => {
    const dataTemp: IComboBoxOption[] = [...groupsData];
    dataTemp.splice(5, 0, {
        key: 'div1',
        text: '',
        itemType: UISelectableOptionMenuItemType.Divider
    });
    dataTemp.splice(15, 0, {
        key: 'div1',
        text: '',
        itemType: UISelectableOptionMenuItemType.Divider
    });
    return (
        <div style={{ width: '300px' }}>
            <UIComboBox
                options={groupsData}
                highlight={true}
                allowFreeform={true}
                useComboBoxAsMenuMinWidth={true}
                autoComplete="on"
                openMenuOnClick={true}
                label="Menu items with headers"
            />
            <UIComboBox
                options={dataTemp}
                highlight={true}
                allowFreeform={true}
                useComboBoxAsMenuMinWidth={true}
                autoComplete="on"
                openMenuOnClick={true}
                label="Menu items with dividers and headers"
            />
            <UIComboBox
                options={groupsData}
                highlight={true}
                allowFreeform={true}
                useComboBoxAsMenuMinWidth={true}
                autoComplete="on"
                openMenuOnClick={true}
                multiSelect={true}
                label="Menu items with headers - multi select"
            />
            <UIComboBox
                options={dataTemp}
                highlight={true}
                allowFreeform={true}
                useComboBoxAsMenuMinWidth={true}
                autoComplete="on"
                openMenuOnClick={true}
                multiSelect={true}
                label="Menu items with dividers and headers - multi select"
            />
        </div>
    );
};
