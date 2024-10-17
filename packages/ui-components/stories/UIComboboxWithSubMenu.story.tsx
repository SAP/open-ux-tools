import type { SetStateAction } from 'react';
import React, { useState } from 'react';
import { Stack } from '@fluentui/react';
import type { IComboBox, IComboBoxOption } from '@fluentui/react';

import {
    UIComboBox,
    UIComboBoxLoaderType,
    UISelectableOptionMenuItemType,
    UIComboBoxDummy,
    UIComboBoxOption
} from '../src/components/UIComboBox';
import { UICheckbox } from '../src/components/UICheckbox';
import { data, groupsData } from '../test/__mock__/select-data';

import { initIcons } from '../src/components/Icons';
import { UITextInput } from '../src/components';

initIcons();

export default { title: 'Dropdowns/Combobox SubMenu' };

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

export const generic = (): JSX.Element => (
    <div style={{ width: '300px' }}>
        <UIComboBoxDummy
            options={tempData}
            highlight={true}
            allowFreeform={true}
            useComboBoxAsMenuMinWidth={true}
            autoComplete="on"
        />
        <UIComboBoxDummy
            options={tempData}
            highlight={true}
            allowFreeform={true}
            useComboBoxAsMenuMinWidth={true}
            autoComplete="on"
            multiSelect={true}
        />
        <div style={{ marginTop: 500 }}>
            <UITextInput />
        </div>
    </div>
);

const editableSingleData = [
    { key: 'tripName', text: 'tripName' },
    { key: 'employee', text: 'employee' },
    { key: 'status', text: 'status' },
    { key: 'qqqqqq1', text: 'qqqqqq1' },
    { key: 'concattesteeee', text: 'concattesteeee' },
    { key: 'zz_newString', text: 'zz_newString' }
];

export const editableSingle = (): JSX.Element => (
    <div style={{ width: '300px' }}>
        <UIComboBoxDummy
            options={editableSingleData}
            highlight={true}
            allowFreeform={true}
            useComboBoxAsMenuMinWidth={true}
            autoComplete="on"
        />
        <UIComboBoxDummy
            options={editableSingleData}
            highlight={true}
            allowFreeform={true}
            useComboBoxAsMenuMinWidth={true}
            autoComplete="on"
            multiSelect={true}
        />
        <div style={{ marginTop: 500 }}>
            <UITextInput />
        </div>
    </div>
);

const editableMultipleData = [
    { key: 'tripName', text: 'tripName' },
    { key: 'employee', text: 'employee' },
    { key: 'status', text: 'status' },
    { key: 'qqqqqq1', text: 'qqqqqq1' },
    { key: 'concattesteeee', text: 'concattesteeee' },
    { key: 'zz_newString', text: 'zz_newString' },
    { key: 'zz_newDouble', text: 'zz_newDouble' },
    { key: 'zz_newInteger', text: 'zz_newInteger' },
    { key: 'zz_newDecimal', text: 'zz_newDecimal' },
    { key: 'zz_newDate', text: 'zz_newDate' }
];

export const editableMultiple = (): JSX.Element => {
    const [option, setOption] = useState<UIComboBoxOption | undefined>();
    const [selectedKey, setSelectedKey] = useState<string | number | undefined>();
    console.log(`editableMultiple -> ${selectedKey}`);
    return (
        <div style={{ width: '300px' }}>
            <UIComboBoxDummy
                options={editableMultipleData}
                highlight={true}
                allowFreeform={true}
                useComboBoxAsMenuMinWidth={true}
                autoComplete="on"
                selectedKey={selectedKey}
                onChange={(event, option) => {
                    setOption(option);
                    setSelectedKey(option?.key);
                }}
            />
            <UIComboBoxDummy
                options={editableMultipleData}
                highlight={true}
                allowFreeform={true}
                useComboBoxAsMenuMinWidth={true}
                autoComplete="on"
                multiSelect={true}
            />
            <div>
                {JSON.stringify(option, (key, value) => {
                    if (['styles', 'options', 'submenuIconProps'].includes(key)) return undefined;

                    return value;
                })}
            </div>
            <div style={{ marginTop: 500 }}>
                <UITextInput />
            </div>
        </div>
    );
};
