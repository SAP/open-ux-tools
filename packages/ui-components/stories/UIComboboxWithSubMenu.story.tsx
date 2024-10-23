import type { SetStateAction } from 'react';
import React, { useState } from 'react';
import { Stack } from '@fluentui/react';
import type { IComboBox, IComboBoxOption } from '@fluentui/react';

import {
    UIComboBox,
    UIComboBoxLoaderType,
    UISelectableOptionMenuItemType,
    ComboBoxEditable,
    UIComboBoxOption
} from '../src/components/UIComboBox';
import { UICheckbox } from '../src/components/UICheckbox';
import { data, groupsData } from '../test/__mock__/select-data';

import { initIcons } from '../src/components/Icons';
import { UITextInput } from '../src/components';
import { OptionKey, UISelectableOptionWithSubValues } from '../src/components/UIComboBox/dummy/types';

initIcons();

export default { title: 'Dropdowns/Combobox SubMenu' };

const replacedFn = (key, value) => {
    return ['styles', 'options', 'submenuIconProps'].includes(key) ? undefined : value;
};

interface EditableComboboxExampleProps {
    options: UISelectableOptionWithSubValues[];
}

const VALUE_PREVIEW_STYLE: React.CSSProperties = {
    border: '1px solid red',
    margin: '10px 0',
    padding: '10px',
    minHeight: 50,
    fontSize: 11,
    wordBreak: 'break-word'
    // position: 'absolute',
    // left: '100px',
    // right: '100px'
};

const EditableComboboxExample = (props: EditableComboboxExampleProps) => {
    const { options } = props;
    const [selectedOption, setSelectedOption] = useState<UIComboBoxOption | undefined>();
    const [selectedOptions, setSelectedOptions] = useState<UIComboBoxOption[] | undefined>([]);
    const [selectedKey, setSelectedKey] = useState<string | number | undefined>();
    const [selectedKeys, setSelectedKeys] = useState<string[] | number[] | undefined>();
    return (
        <div>
            <div style={{ position: 'relative' }}>
                <div style={VALUE_PREVIEW_STYLE}>
                    <div>{selectedKey}</div>
                    <div>{JSON.stringify(selectedOption, replacedFn)}</div>
                </div>
            </div>
            <div style={{ width: '300px' }}>
                <ComboBoxEditable
                    options={[...options]}
                    highlight={true}
                    allowFreeform={true}
                    useComboBoxAsMenuMinWidth={true}
                    autoComplete="on"
                    selectedKey={selectedKey}
                    onChange={(event, option) => {
                        console.log('ochange!!! -> option ' + option?.key);
                        setSelectedOption(option);
                        setSelectedKey(option?.key);
                    }}
                />
            </div>

            <div style={VALUE_PREVIEW_STYLE}>
                <div>{selectedKeys?.join(', ')}</div>
                <div>{JSON.stringify(selectedOptions, replacedFn)}</div>
            </div>
            <div style={{ width: '300px' }}>
                <ComboBoxEditable
                    options={options}
                    multiSelect={true}
                    highlight={true}
                    allowFreeform={true}
                    useComboBoxAsMenuMinWidth={true}
                    autoComplete="on"
                    selectedKey={selectedKeys}
                    onChange={(
                        event,
                        option?: UIComboBoxOption | undefined,
                        index?: number,
                        value?: string,
                        selection?: OptionKey
                    ) => {
                        console.log('ochange!!! -> value ' + value + '; selection' + JSON.stringify(selection));
                        if (selection) {
                            setSelectedKeys(selection as string[]);
                        }
                        // if (option) {
                        //     console.log('ochange!!!');
                        //     const newKeys = [...(selectedKeys ?? []), option.key].filter((k) =>
                        //         option.selected ? true : k !== option.key
                        //     );
                        //     setSelectedKeys(newKeys as string[]);

                        //     const newOptions = [...(selectedOptions ?? []), option].filter((checkOption) =>
                        //         option.selected ? true : checkOption.key !== option.key
                        //     );
                        //     setSelectedOptions(newOptions);
                        // }
                    }}
                />
            </div>
            <div style={{ marginTop: 500 }}>
                <UITextInput />
            </div>
        </div>
    );
};

export const generic = (): JSX.Element => <EditableComboboxExample options={data} />;

const editableSingleData = [
    { key: 'tripName', text: 'tripName' },
    { key: 'employee', text: 'employee' },
    { key: 'status', text: 'status' },
    { key: 'qqqqqq1', text: 'qqqqqq1' },
    { key: 'concattesteeee', text: 'concattesteeee' },
    { key: 'zz_newString', text: 'zz_newString' }
];

export const editableSingle = (): JSX.Element => <EditableComboboxExample options={editableSingleData} />;

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

export const editableMultiple = (): JSX.Element => <EditableComboboxExample options={editableMultipleData} />;

const editableEntityData = [
    { 'key': 'Travel', 'text': 'Travel' },
    { 'key': 'Bookings', 'text': 'Bookings' },
    { 'key': 'Notes', 'text': 'Notes' },
    { 'key': 'usedEntity', 'text': 'usedEntity' },
    { 'key': 'zz_newEntity1', 'text': 'zz_newEntity1' }
];

export const editableEntity = (): JSX.Element => <EditableComboboxExample options={editableEntityData} />;

const largeData = [
    { 'key': 'concattesteeee', 'text': 'concattesteeee' },
    { 'key': 'dawdawdaw', 'text': 'dawdawdaw' },
    { 'key': 'dawdwad', 'text': 'dawdwad' },
    { 'key': 'zz_newBoolean', 'text': 'zz_newBoolean' },
    { 'key': 'zz_newBoolean1', 'text': 'zz_newBoolean1' },
    { 'key': 'zz_newBoolean2', 'text': 'zz_newBoolean2' },
    { 'key': 'zz_newDate', 'text': 'zz_newDate' },
    { 'key': 'zz_newDate1', 'text': 'zz_newDate1' },
    { 'key': 'zz_newDate2', 'text': 'zz_newDate2' },
    { 'key': 'zz_newDecimal', 'text': 'zz_newDecimal' },
    { 'key': 'zz_newDecimal1', 'text': 'zz_newDecimal1' },
    { 'key': 'zz_newDecimal2', 'text': 'zz_newDecimal2' },
    { 'key': 'bookings/airlines', 'text': 'bookings/airlines' },
    { 'key': 'bookings/bookingDate', 'text': 'bookings/bookingDate' },
    { 'key': 'bookings/zz_newBoolean3', 'text': 'bookings/zz_newBoolean3' },
    { 'key': 'bookings/zz_newBoolean4', 'text': 'bookings/zz_newBoolean4' },
    { 'key': 'bookings/zz_newBoolean5', 'text': 'bookings/zz_newBoolean5' },
    { 'key': 'bookings/zz_newDate3', 'text': 'bookings/zz_newDate3' },
    { 'key': 'bookings/zz_newDate4', 'text': 'bookings/zz_newDate4' },
    { 'key': 'notes/comment', 'text': 'notes/comment' },
    { 'key': 'notes/doubletestedvalue', 'text': 'notes/doubletestedvalue' },
    { 'key': 'notes/zz_newBoolean6', 'text': 'notes/zz_newBoolean6' },
    { 'key': 'notes/zz_newBoolean7', 'text': 'notes/zz_newBoolean7' },
    { 'key': 'notes/zz_newBoolean8', 'text': 'notes/zz_newBoolean8' },
    { 'key': 'notes/zz_newDate6', 'text': 'notes/zz_newDate6' },
    { 'key': 'notes/zz_newDate7', 'text': 'notes/zz_newDate7' },
    { 'key': 'notes/zz_newDate8', 'text': 'notes/zz_newDate8' },
    { 'key': 'notes/zz_newDecimal6', 'text': 'notes/zz_newDecimal6' },
    { 'key': 'notes/zz_newDecimal7', 'text': 'notes/zz_newDecimal7' },
    { 'key': 'notes/zz_newDecimal8', 'text': 'notes/zz_newDecimal8' },
    { 'key': 'notes/zz_newDouble6', 'text': 'notes/zz_newDouble6' },
    { 'key': 'notes/zz_newDouble7', 'text': 'notes/zz_newDouble7' },
    { 'key': 'notes/zz_newDouble8', 'text': 'notes/zz_newDouble8' },
    { 'key': 'notes/zz_newInteger6', 'text': 'notes/zz_newInteger6' },
    { 'key': 'notes/zz_newInteger7', 'text': 'notes/zz_newInteger7' },
    { 'key': 'notes/zz_newInteger8', 'text': 'notes/zz_newInteger8' },
    { 'key': 'notes/zz_newString11', 'text': 'notes/zz_newString11' },
    { 'key': 'notes/zz_newString12', 'text': 'notes/zz_newString12' },
    { 'key': 'notes/zz_newString13', 'text': 'notes/zz_newString13' },
    { 'key': 'notes/zz_newTime6', 'text': 'notes/zz_newTime6' },
    { 'key': 'notes/zz_newTime7', 'text': 'notes/zz_newTime7' },
    { 'key': 'notes/zz_newTime8', 'text': 'notes/zz_newTime8' }
];

[
    { 'key': 'concattesteeee', 'text': 'concattesteeee' },
    { 'key': 'dawdawdaw', 'text': 'dawdawdaw' },
    { 'key': 'dawdwad', 'text': 'dawdwad' },
    {
        'key': 'zz_newBoolean',
        'text': '',
        'options': [
            { 'key': 'zz_newBoolean', 'text': 'Boolean' },
            { 'key': 'zz_newBoolean1', 'text': 'Boolean' },
            { 'key': 'zz_newBoolean2', 'text': 'Boolean' },
            { 'key': 'zz_newDate', 'text': 'Date' },
            { 'key': 'zz_newDate1', 'text': 'Date' },
            { 'key': 'zz_newDate2', 'text': 'Date' },
            { 'key': 'zz_newDecimal', 'text': 'Decimal' },
            { 'key': 'zz_newDecimal1', 'text': 'Decimal' },
            { 'key': 'zz_newDecimal2', 'text': 'Decimal' }
        ],
        'editable': true,
        'subValue': { 'key': 'zz_newBoolean', 'text': 'Boolean' }
    },
    { 'key': 'bookings/airlines', 'text': 'bookings/airlines' },
    { 'key': 'bookings/bookingDate', 'text': 'bookings/bookingDate' },
    {
        'key': 'bookings/zz_newBoolean3',
        'text': '',
        'options': [
            { 'key': 'bookings/zz_newBoolean3' },
            { 'key': 'bookings/zz_newBoolean4' },
            { 'key': 'bookings/zz_newBoolean5' }
        ],
        'editable': true,
        'subValue': { 'key': 'zz_newBoolean', 'text': 'Boolean' }
    },
    { 'key': 'notes/comment', 'text': 'notes/comment' },
    { 'key': 'notes/doubletestedvalue', 'text': 'notes/doubletestedvalue' },
    {
        'key': 'notes/zz_newBoolean6',
        'text': '',
        'options': [
            { 'key': 'notes/zz_newBoolean6' },
            { 'key': 'notes/zz_newBoolean7' },
            { 'key': 'notes/zz_newBoolean8' },
            { 'key': 'notes/zz_newDate6' },
            { 'key': 'notes/zz_newDate7' },
            { 'key': 'notes/zz_newDate8' },
            { 'key': 'notes/zz_newDecimal6' },
            { 'key': 'notes/zz_newDecimal7' },
            { 'key': 'notes/zz_newDecimal8' },
            { 'key': 'notes/zz_newDouble6' },
            { 'key': 'notes/zz_newDouble7' },
            { 'key': 'notes/zz_newDouble8' },
            { 'key': 'notes/zz_newInteger6' },
            { 'key': 'notes/zz_newInteger7' },
            { 'key': 'notes/zz_newInteger8' },
            { 'key': 'notes/zz_newString11' },
            { 'key': 'notes/zz_newString12' },
            { 'key': 'notes/zz_newString13' },
            { 'key': 'notes/zz_newTime6' },
            { 'key': 'notes/zz_newTime7' },
            { 'key': 'notes/zz_newTime8' }
        ],
        'editable': true,
        'subValue': { 'key': 'zz_newBoolean', 'text': 'Boolean' }
    }
];

export const editableLarge = (): JSX.Element => <EditableComboboxExample options={largeData} />;
