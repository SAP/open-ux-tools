import React from 'react';
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
