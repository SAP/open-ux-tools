import React from 'react';
import { Stack } from '@fluentui/react';
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
    const [changesCount, setChangesCount] = React.useState(0);
    const [value, setValue] = React.useState('');
    const handleSelected = (value: any) => {
        console.log(`Value: ${value}`);
        setChangesCount(changesCount + 1);
        setValue(value);
    };

    return (
        <div style={{ width: 300 }}>
            <UITreeDropdown
                value={value}
                label={`Label(value changed ${changesCount} times)`}
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

export const accessibilityStates = () => {
    const [selectedKey, setSelectedKey] = React.useState<string>('_Title1');
    const stackTokens = { childrenGap: 40 };
    const testProps = {
        placeholderText: 'Select value',
        items: data,
        maxWidth: 300,
        onParameterValueChange: (value) => console.log(value)
    };
    const changeableProps = {
        ...testProps,
        onParameterValueChange: (value) => setSelectedKey(value)
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
                            <UITreeDropdown {...testProps} placeholderText="Placeholder"></UITreeDropdown>
                        </td>
                        <td>
                            <UITreeDropdown {...changeableProps} value={selectedKey}></UITreeDropdown>
                        </td>
                    </tr>
                    <tr>
                        <td>Error</td>
                        <td>
                            <UITreeDropdown
                                {...testProps}
                                placeholderText="Placeholder"
                                errorMessage="Dummy error"></UITreeDropdown>
                        </td>
                        <td>
                            <UITreeDropdown
                                {...changeableProps}
                                errorMessage="Dummy error"
                                value={selectedKey}></UITreeDropdown>
                        </td>
                    </tr>
                    <tr>
                        <td>Disabled</td>
                        <td>
                            <UITreeDropdown {...testProps} placeholderText="Placeholder" items={[]}></UITreeDropdown>
                        </td>
                        <td>
                            <UITreeDropdown {...changeableProps} value={selectedKey} items={[]}></UITreeDropdown>
                        </td>
                    </tr>
                    <tr>
                        <td>Read Only</td>
                        <td>
                            <UITreeDropdown {...testProps} placeholderText="Placeholder" readOnly></UITreeDropdown>
                        </td>
                        <td>
                            <UITreeDropdown {...changeableProps} value={selectedKey} readOnly></UITreeDropdown>
                        </td>
                    </tr>
                </table>
            </Stack>
        </div>
    );
};
