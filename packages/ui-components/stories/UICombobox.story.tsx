import type { SetStateAction } from 'react';
import React, { useState } from 'react';
import type { IComboBox, IComboBoxOption } from '@fluentui/react';

import { UIComboBox } from '../src/components/UIComboBox';
import { data } from '../test/__mock__/select-data';

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
        <UIComboBox options={data} isLoading={true} styles={{ optionsContainerWrapper: { width: '262px' } }} />
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
