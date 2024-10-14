import React from 'react';
import { Stack } from '@fluentui/react';
import type { IDropdownOption } from '@fluentui/react';
import {
    UISelectableOptionMenuItemType,
    UICheckbox,
    UIDropdown,
    initIcons,
    UISelectableOption,
    UITextInput
} from '../src/components';
import { data, shortData, groupsData } from '../test/__mock__/select-data';

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

export const groupsAndSeparators = () => {
    const dataTemp: IDropdownOption[] = [...groupsData];
    dataTemp.splice(4, 0, {
        key: 'div1',
        text: '',
        itemType: UISelectableOptionMenuItemType.Divider
    });
    dataTemp.splice(14, 0, {
        key: 'div1',
        text: '',
        itemType: UISelectableOptionMenuItemType.Divider
    });
    dataTemp.splice(18, 0, {
        key: 'div1',
        text: '',
        itemType: UISelectableOptionMenuItemType.Divider
    });
    return (
        <div style={{ width: '300px' }}>
            <UIDropdown options={groupsData} label="Menu items with headers" />
            <UIDropdown options={dataTemp} label="Menu items with dividers and headers" />
            <UIDropdown options={groupsData} multiSelect={true} label="Menu items with headers - multi select" />
            <UIDropdown
                options={dataTemp}
                multiSelect={true}
                label="Menu items with dividers and headers - multi select"
            />
        </div>
    );
};

const editableEntries = ['AR', 'BR', 'DK'];

const tempData = data.map((item) => {
    if (editableEntries.includes(item.key)) {
        return {
            ...item,
            editable: true
        };
    }
    return item;
});

export const customRender = () => {
    return (
        <UIDropdown
            options={tempData}
            onRenderOption={(
                props?: UISelectableOption,
                defaultRender?: (props?: UISelectableOption) => JSX.Element | null
            ) => {
                if ('editable' in (props ?? {})) {
                    return (
                        <UITextInput
                            onMouseDown={(event) => {
                                const target = event.target as HTMLElement;
                                target.focus();
                            }}
                            onClick={(event) => {
                                event.nativeEvent.preventDefault();
                                event.nativeEvent.stopPropagation();
                                event.preventDefault();
                                event.stopPropagation();
                            }}
                        />
                    );
                }
                return defaultRender?.(props) ?? null;
            }}
            onRenderItem={(
                props?: UISelectableOption,
                defaultRender?: (props?: UISelectableOption) => JSX.Element | null
            ) => {
                return defaultRender?.(props) ?? null;
            }}
        />
    );
};
