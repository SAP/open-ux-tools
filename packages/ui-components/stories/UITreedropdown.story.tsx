import React from 'react';
import { UITreeDropdown } from '../src/components/UITreeDropdown';

export default { title: 'Dropdowns/TreeDropdown' };

const data = [
    {
        value: '__OperationControl',
        label: '__OperationControl',
        children: [
            { value: 'SAP__Messages', label: 'SAP__Messages', children: [] },
            { value: '_Title', label: '_Title', children: [] },
            { value: '_Title2', label: '_Title2', children: [] },
            { value: '_Title3', label: '_Title3', children: [] }
        ]
    },
    { value: 'SAP__Messages', label: 'SAP__Messages', children: [] },
    {
        value: 'DraftAdministrativeData',
        label: 'DraftAdministrativeData',
        children: [{ value: 'SAP__Other', label: 'SAP__Other', children: [] }]
    },
    { value: '_Artist', label: '_Artist', children: [] },
    { value: '_Title', label: '_Title', children: [] },
    { value: '_Title1', label: '_Title1', children: [] },
    { value: '_Title2', label: '_Title2', children: [] },
    { value: '_Title3', label: '_Title3', children: [] },
    { value: '_Title4', label: '_Title4', children: [] },
    { value: '_Title5', label: '_Title5', children: [] },
    { value: '_Title6', label: '_Title6', children: [] },
    { value: '_Title7', label: '_Title7', children: [] },
    { value: '_Title8', label: '_Title8', children: [] },
    { value: '_Title9', label: '_Title9', children: [] }
];

export const Basic = (): JSX.Element => {
    const [value, setValue] = React.useState('');
    const handleSelected = (value: any) => setValue(value);

    return (
        <div style={{ width: 300 }}>
            <UITreeDropdown
                value={value}
                label="Label"
                placeholderText="Select value"
                items={data}
                onParameterValueChange={handleSelected}
                maxWidth={300}
            />
        </div>
    );
};

export const Message = (): JSX.Element => {
    const [value, setValue] = React.useState('');
    const handleSelected = (value: any) => setValue(value);

    return (
        <div style={{ width: 300 }}>
            <UITreeDropdown
                value={value}
                label="Label"
                placeholderText="Select value"
                items={data}
                onParameterValueChange={handleSelected}
                maxWidth={300}
                errorMessage="Dummy error"
            />
        </div>
    );
};
