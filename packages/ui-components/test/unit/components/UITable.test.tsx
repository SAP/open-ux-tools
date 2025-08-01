import * as React from 'react';
import * as Enzyme from 'enzyme';
import { KeyCodes } from '@fluentui/react';
import { ColumnControlType, UITable } from '../../../src/components/UITable';
import type { UIColumn } from '../../../src/components/UITable';
import * as tableHelper from '../../../src/components/UITable/UITable-helper';

describe('<UITable />', () => {
    const onSaveSpy = jest.fn();

    const defaultProps = {
        dataSetKey: 'entity',
        renderInputs: false,
        columns: [],
        items: [],
        onSave: onSaveSpy
    };

    const columnText = {
        key: 'textcolumn',
        name: 'textcolumn',
        fieldName: 'text',
        minWidth: 100,
        maxWidth: 200,
        isResizable: true,
        editable: true,
        validate: undefined as any,
        iconName: undefined as any,
        iconTooltip: undefined as any,
        columnControlType: ColumnControlType.UITextInput
    };

    const columnBool = {
        key: 'boolcolumn',
        name: 'boolcolumn',
        fieldName: 'bool',
        minWidth: 100,
        maxWidth: 200,
        isResizable: true,
        editable: true,
        validate: undefined as any,
        iconName: undefined as any,
        iconTooltip: undefined as any,
        columnControlType: ColumnControlType.UIBooleanSelect
    };

    const columnCombobox = {
        key: 'comboboxcolumn',
        name: 'comboboxcolumn',
        fieldName: 'combobox',
        minWidth: 100,
        maxWidth: 200,
        isResizable: true,
        editable: true,
        validate: undefined as any,
        iconName: undefined as any,
        iconTooltip: undefined as any,
        columnControlType: ColumnControlType.UICombobox,
        comboboxOptions: ['one', 'two', 'three']
    };

    const columnDate = {
        key: 'datecolumn',
        name: 'datecolumn',
        fieldName: 'date',
        minWidth: 100,
        maxWidth: 200,
        isResizable: true,
        editable: true,
        validate: jest.fn(),
        iconName: undefined as any,
        iconTooltip: undefined as any,
        columnControlType: ColumnControlType.UIDatePicker
    };

    const columnDropdown = {
        key: 'dropdowncolumn',
        name: 'dropdowncolumn',
        fieldName: 'dropdowncolumn',
        minWidth: 100,
        maxWidth: 200,
        isResizable: true,
        editable: true,
        validate: undefined as any,
        iconName: undefined as any,
        iconTooltip: undefined as any,
        columnControlType: ColumnControlType.UIDropdown,
        data: {
            dropdownOptions: [
                { key: 'IE', text: 'Ireland' },
                { key: 'DE', text: 'Germany' },
                { key: 'US', text: 'United States' },
                { key: 'LV', text: 'Latvia' }
            ]
        }
    };

    const columnValidate = {
        key: 'validatecolumn',
        name: 'validatecolumn',
        fieldName: 'validate',
        minWidth: 100,
        maxWidth: 200,
        isResizable: true,
        editable: true,
        validate: (value: any) => `Error: ${value}`,
        iconName: undefined as any,
        iconTooltip: undefined as any,
        columnControlType: ColumnControlType.UITextInput
    };

    beforeEach(() => {
        jest.useFakeTimers();
        jest.spyOn(window, 'requestAnimationFrame').mockImplementation((cb: any) => {
            cb(1);
            return 1;
        });
    });

    afterEach(() => {
        jest.useRealTimers();
        jest.clearAllMocks();
    });

    it('Should render a UITable component', () => {
        const wrapper = Enzyme.mount(<UITable {...defaultProps} />);
        expect(wrapper.find('.ms-DetailsList').length).toEqual(1);
    });

    it('Render table with data', () => {
        const moduleName = {
            key: 'moduleName',
            name: 'moduleName',
            fieldName: 'moduleName',
            minWidth: 100,
            maxWidth: 200,
            isResizable: true,
            editable: true,
            validate: undefined as any,
            iconName: undefined as any,
            iconTooltip: undefined as any,
            columnControlType: ColumnControlType.UITextInput,
            getValueKey: () => 'dummyKey'
        };
        const wrapper = Enzyme.mount(
            <UITable
                {...defaultProps}
                enableUpdateAnimations={true}
                columns={[columnText, moduleName]}
                items={[{ text: 'apple' }, { text: 'module', hideCells: true }]}
            />
        );
        expect(wrapper.find('[data-automationid="DetailsRowCell"]').at(0).key()).toEqual('textcolumn');
        expect(wrapper.find('[data-automationid="DetailsRowCell"]').at(1).key()).toEqual('moduleName-dummyKey');
    });

    it('Toggle cell for editing', () => {
        const wrapper = Enzyme.mount(<UITable {...defaultProps} columns={[columnText]} items={[{ text: 'apple' }]} />);

        expect(wrapper.find('.ms-DetailsRow-cell span').length).toEqual(1);
        expect(wrapper.find('.ms-DetailsRow-cell input.ms-TextField-field').length).toEqual(0);

        wrapper.find('.ms-DetailsRow-cell span').simulate('click');
        expect(wrapper.find('.ms-DetailsRow-cell span').length).toEqual(0);
        expect(wrapper.find('.ms-DetailsRow-cell input.ms-TextField-field').length).toEqual(1);

        wrapper.find('.ms-DetailsRow-cell input.ms-TextField-field').simulate('mousedown');
        expect(wrapper.find('.ms-DetailsRow-cell span').length).toEqual(0);
        expect(wrapper.find('.ms-DetailsRow-cell input.ms-TextField-field').length).toEqual(1);
    });

    it('Cell navigation in edit mode', () => {
        const wrapper = Enzyme.mount(
            <UITable
                {...defaultProps}
                columns={[columnBool, columnText, columnCombobox]}
                items={[
                    { bool: 'true', text: 'apple' },
                    { bool: 'false', text: 'orange' }
                ]}
            />
        );

        wrapper.find('.ms-DetailsRow-cell span').first().simulate('click');
        wrapper.find('input').simulate('keyDown', { key: 'Tab' });
        jest.runOnlyPendingTimers();
        wrapper.find('input').simulate('keyDown', { key: 'Enter' });
        jest.runOnlyPendingTimers();
        wrapper.find('input').simulate('keyDown', { key: 'Tab', shiftKey: true });
        jest.runOnlyPendingTimers();
        wrapper.find('input').simulate('keyDown', { key: 'Enter', shiftKey: true });
        jest.runOnlyPendingTimers();

        // test not running properly, must investigate
    });

    it('Text input', () => {
        const wrapper = Enzyme.mount(<UITable {...defaultProps} columns={[columnText]} items={[{ text: 'apple' }]} />);

        wrapper.find('.ms-DetailsRow-cell span').simulate('click');
        const input = wrapper.find('.ms-DetailsRow-cell input.ms-TextField-field');
        (input.instance() as any).value = 'orange';
        input.simulate('change', { target: { value: 'orange' } });
        input.simulate('keyDown', { key: 'Enter' });
        jest.runOnlyPendingTimers();
        expect(onSaveSpy).toHaveBeenCalledTimes(1);
        expect(onSaveSpy.mock.calls[0][1]).toBe('orange');
    });

    it('Text input - cancel edit', () => {
        const wrapper = Enzyme.mount(<UITable {...defaultProps} columns={[columnText]} items={[{ text: 'apple' }]} />);

        wrapper.find('.ms-DetailsRow-cell span').simulate('click');
        const input = wrapper.find('.ms-DetailsRow-cell input.ms-TextField-field');
        (input.instance() as any).value = 'orange';
        input.simulate('change', { target: { value: 'orange' } });
        input.simulate('keyDown', { key: 'Escape' });
        jest.runOnlyPendingTimers();
        expect(onSaveSpy).toHaveBeenCalledTimes(0);
    });

    it('Date picker', () => {
        const wrapper = Enzyme.mount(
            <UITable {...defaultProps} columns={[columnDate]} items={[{ date: '2022-08-07' }]} />
        );

        wrapper.find('.ms-DetailsRow-cell span').simulate('click');
        const input = wrapper.find('.ms-DetailsRow-cell input.ms-TextField-field');
        (input.instance() as any).value = 'orange';
        input.simulate('change', { target: { value: '2020-08-07' } });
        input.simulate('keyDown', { key: 'Enter' });
        jest.runOnlyPendingTimers();
        expect(onSaveSpy).toHaveBeenCalledTimes(1);
        expect(onSaveSpy.mock.calls[0][1]).toBe('2020-08-07');
    });

    it('Boolean selector', () => {
        const wrapper = Enzyme.mount(<UITable {...defaultProps} columns={[columnBool]} items={[{ bool: 'true' }]} />);

        wrapper.find('.ms-DetailsRow-cell span').simulate('click');
        const input = wrapper.find('.ms-DetailsRow-cell input.ms-ComboBox-Input');
        input.simulate('keyDown', { key: 'ArrowDown', which: KeyCodes.down });
        input.simulate('keyDown', { key: 'Enter' });
        jest.runOnlyPendingTimers();
        expect(onSaveSpy).toHaveBeenCalledTimes(1);
        expect(onSaveSpy.mock.calls[0][1]).toBe('false');
    });

    it('Boolean selector - typed', () => {
        const wrapper = Enzyme.mount(<UITable {...defaultProps} columns={[columnBool]} items={[{ bool: 'true' }]} />);

        wrapper.find('.ms-DetailsRow-cell span').simulate('click');
        const input = wrapper.find('.ms-DetailsRow-cell input.ms-ComboBox-Input');
        (input.instance() as any).value = 'false';
        input.simulate('keyDown', { key: 'Enter' });
        jest.runOnlyPendingTimers();
        expect(onSaveSpy).toHaveBeenCalledTimes(1);
        expect(onSaveSpy.mock.calls[0][1]).toBe('false');
    });

    it('Cell navigation in edit mode with dropdown and renderinputs', () => {
        const wrapper = Enzyme.mount(
            <UITable
                {...defaultProps}
                columns={[columnBool, columnText, columnDropdown]}
                items={[{ bool: 'true', text: 'apple', dropdowncolumn: 'IE' }]}
                renderInputs={true}
            />
        );

        expect(wrapper.find('Dropdown').first().text()).toEqual('Ireland');
        wrapper.find('.ms-DetailsRow-cell span').first().simulate('click');
        wrapper.find('input').first().simulate('keyDown', { key: 'Tab' });
        jest.runOnlyPendingTimers();
        wrapper.find('input').first().simulate('keyDown', { key: 'Enter' });
        jest.runOnlyPendingTimers();
        wrapper.find('input').first().simulate('keyDown', { key: 'Tab', shiftKey: true });
        jest.runOnlyPendingTimers();
        wrapper.find('input').first().simulate('keyDown', { key: 'Enter', shiftKey: true });
        jest.runOnlyPendingTimers();

        wrapper.find('Dropdown').first().simulate('click');
    });

    it('Validate and focus', () => {
        const wrapper = Enzyme.mount(
            <UITable {...defaultProps} columns={[columnValidate]} items={[{ validate: 'invalid' }]} />
        );

        wrapper.find('.ms-DetailsRow-cell span').simulate('click');
        const input = wrapper.find('.ms-DetailsRow-cell input.ms-TextField-field');
        const mockCell = {
            selectionStart: 99,
            setSelectionRange: jest.fn()
        };
        const mockInput = {
            querySelector: () => mockCell
        };
        jest.spyOn(tableHelper, 'getCellFromCoords').mockImplementation(
            (rowIdx: number, columnKey: string, columns: UIColumn[], addOneToColIndex: boolean | undefined) => {
                expect(rowIdx).toBe(0);
                expect(columnKey).toBe('validatecolumn');
                expect(columns).toBeDefined();
                expect(addOneToColIndex).toBe(true);
                mockCell.selectionStart++;
                return mockInput as any;
            }
        );
        input.simulate('change', { target: { value: 'stillinvalid' } });
        jest.runOnlyPendingTimers();
        expect(mockCell.setSelectionRange).toHaveBeenCalledWith(100, 100);
    });
});
