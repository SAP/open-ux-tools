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
                    options={options}
                    highlight={true}
                    allowFreeform={true}
                    useComboBoxAsMenuMinWidth={true}
                    autoComplete="on"
                    selectedKey={selectedKey}
                    onChange={(event, option) => {
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
                    // selectedKey={selectedKeys}
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
