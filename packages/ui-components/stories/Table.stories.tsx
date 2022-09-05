import React, { useState } from 'react';
import { UITable, UIDropdownOption, UiIcons } from '../src/components';
import { UIColumn, ColumnControlType, RenderInputs } from '../src/components/UITable/types';
import {
    CheckboxVisibility,
    SelectionMode,
    Stack,
    mergeStyles,
    IRenderFunction,
    IDetailsHeaderProps,
    Sticky
} from '@fluentui/react';
import { items } from './table-data';

export default { title: 'Tables/UITable' };

const columns: UIColumn[] = Array.from({ length: 10 }).map((item, index) => {
    const col = {
        key: 'column' + (index + 1),
        name: 'Test ' + (index + 1),
        fieldName: 'test' + (index + 1),
        minWidth: 100,
        maxWidth: 200,
        isResizable: true,
        editable: false,
        validate: undefined as any,
        iconName: undefined as any,
        iconTooltip: undefined as any,
        columnControlType: ColumnControlType.UITextInput
    };
    if (index === 1 || index >= 3) {
        col.name += ' (editable)';
        col.editable = true;
        col.validate = validate;
    }
    if (index === 1) {
        col.iconName = UiIcons.Home;
        col.iconTooltip = 'Dummy tooltip';
    }
    if (index === 3) {
        col.columnControlType = ColumnControlType.UIBooleanSelect;
    }
    return col;
});

// *** READONLY GRID *******************************************************************************

const readOnlyColumns = columns.map((c) => {
    return Object.assign({}, c, { validate: undefined, editable: false });
});

export const ReadOnlyTable = (): JSX.Element => {
    return (
        <Stack>
            <div className={mergeStyles({ height: '50vh', width: '100vh', position: 'relative' })}>
                <UITable items={items} dataSetKey={'datasetkey'} columns={readOnlyColumns} />
            </div>
        </Stack>
    );
};

// *** EDITABLE GRID (DATA EDITOR) *****************************************************************

function onSave(editedCell: any, newValue: any) {
    console.log('saving ', newValue, editedCell);
}

function onSelectionChange(items: []) {
    console.log('selected', items);
}

function validate(newValue: any) {
    if (newValue === 'hello') return '"hello" is not allowed here!';
    return;
}

export const EditableTable = (): JSX.Element => {
    const [selectedRow, setSelectedRow] = useState(null as any);
    const [selectedColumn, setSelectedColumn] = useState(null as any);
    return (
        <Stack>
            <div>
                <button onClick={() => setSelectedRow(1)}>Scroll to 1st row</button>&nbsp;
                <button onClick={() => setSelectedRow(9)}>Scroll to 9th row</button>&nbsp;
                <button onClick={() => setSelectedRow(100)}>Scroll to 100th row</button>&nbsp;
                <button onClick={() => setSelectedColumn('column1')}>Scroll to 1st column</button>&nbsp;
                <button onClick={() => setSelectedColumn('column10')}>Scroll to 10th column</button>&nbsp;
            </div>
            <div className={mergeStyles({ height: '90vh', width: '100vw', position: 'relative' })}>
                <UITable
                    dataSetKey={'datasetkey'}
                    items={items}
                    columns={columns}
                    onSave={onSave}
                    onSelectionChange={onSelectionChange}
                    selectedRow={selectedRow}
                    selectedColumnId={selectedColumn}
                    selectionMode={SelectionMode.multiple}
                    checkboxVisibility={CheckboxVisibility.always}
                    showRowNumbers={true}
                />
            </div>
        </Stack>
    );
};

// *** EDITABLE GRID (DM MIGRATION) ****************************************************************

const _onHeaderRender: IRenderFunction<IDetailsHeaderProps> = (props, defaultRender?) => {
    if (!defaultRender) return null;
    return <Sticky>{defaultRender(props)}</Sticky>;
};

const dropdownOptions: UIDropdownOption[] = [
    { key: '', text: '' },
    { key: 'DZ', text: 'Algeria' },
    { key: 'AR', text: 'Argentina' },
    { key: 'AU', text: 'Australia' },
    { key: 'AT', text: 'Austria' },
    { key: 'BH', text: 'Bahrain' }
];

const columnsWithDropdown = columns.map((c, idx) => {
    if (idx === 1) {
        return Object.assign({}, c, {
            columnControlType: ColumnControlType.UIDropdown,
            data: { dropdownOptions }
        });
    }
    return Object.assign({}, c);
});

export const EditableTable2 = (): JSX.Element => {
    return (
        <Stack>
            <div className={mergeStyles({ height: '90vh', width: '100vw', position: 'relative' })}>
                <UITable
                    dataSetKey={'datasetkey'}
                    items={items}
                    columns={columnsWithDropdown}
                    onSave={onSave}
                    onSelectionChange={onSelectionChange}
                    checkboxVisibility={CheckboxVisibility.always}
                    headerRenderer={_onHeaderRender}
                    selectionMode={SelectionMode.multiple}
                    renderInputs={RenderInputs.always}
                />
            </div>
        </Stack>
    );
};
