import React from 'react';
import { fireEvent } from '@testing-library/react';
import { render } from '@testing-library/react';
import { DropdownEditable } from '../../../src/components';

const data = [
    { key: 'test', text: 'test' },
    { key: 'zz_newBoolean', text: 'zz_newBoolean' },
    { key: 'zz_newDate', text: 'zz_newDate' },
    { key: 'zz_newDecimal', text: 'zz_newDecimal' }
];

global.structuredClone = (value) => {
    return JSON.parse(JSON.stringify(value));
};

describe('<DropdownEditable />', () => {
    const selectors = {
        root: '.editable-dropdown',
        dropdownExpandBtn: '.ms-Dropdown .ms-Dropdown-caretDownWrapper',
        dropdownMenuItem: '.ms-Dropdown-item',
        dropdownMenuEditableItem: '.ms-Dropdown-item .editable-item',
        dropdownMenuEditableItemInput: '.ms-Dropdown-item .editable-item input',
        callout: '.ms-Dropdown-callout',
        subMenuCallout: '.ms-ContextualMenu-Callout',
        subMenuItem: '.ms-ContextualMenu-link'
    };

    const toggleDropdown = (): void => {
        const toggleBtn = document.querySelector(selectors.dropdownExpandBtn) as HTMLElement;
        fireEvent.click(toggleBtn);
    };

    const getItemByIndex = (index = 0) => {
        const items = document.querySelectorAll(selectors.dropdownMenuItem);
        return items[index] as HTMLInputElement;
    };

    const clickOnDropdownItem = (index = 0): void => {
        const item = getItemByIndex(index);
        fireEvent.click(item);
    };

    const editItem = (value: string, index = 0, submit = false): void => {
        const editInputs = document.querySelectorAll(selectors.dropdownMenuEditableItemInput);
        const editInput = editInputs[index] as HTMLInputElement;
        fireEvent.click(editInput);
        fireEvent.change(editInput, { target: { value } });
        if (submit) {
            fireEvent.keyDown(editInput, { key: 'Enter' });
        }
    };

    const getSubMenuItems = () => {
        const subMenuCallout = document.querySelector(selectors.subMenuCallout) as HTMLElement;
        return subMenuCallout?.querySelectorAll(selectors.subMenuItem);
    };

    const selectSubvalue = (index = 0, subItemIndex = 0): void => {
        // Open submenu
        const item = getItemByIndex(index);
        fireEvent.mouseOver(item);
        // Click onsubmenu item
        const items = getSubMenuItems();
        fireEvent.click(items[subItemIndex]);
    };

    beforeAll(() => {
        //initI18n();
    });

    test('Initial render', () => {
        render(<DropdownEditable options={[]} />);
        expect(document.querySelectorAll(selectors.root).length).toEqual(1);
    });

    describe('Single edit', () => {
        test('Render', () => {
            render(<DropdownEditable options={data} />);
            toggleDropdown();
            // Check all menu items
            expect(document.querySelectorAll(selectors.dropdownMenuItem).length).toEqual(2);
            // Check editable menu items
            expect(document.querySelectorAll(selectors.dropdownMenuEditableItem).length).toEqual(1);
        });

        test('Select edited item by click', () => {
            const onChange = jest.fn();
            render(<DropdownEditable options={data} onChange={onChange} />);
            toggleDropdown();
            editItem('testclick', 0);
            clickOnDropdownItem(1);
            // Check change callback
            expect(onChange).toBeCalledTimes(1);
            const call = onChange.mock.calls[0];
            expect(call[1]).toEqual(
                expect.objectContaining({
                    editable: true,
                    key: 'zz_newBoolean-testclick',
                    subValue: { key: 'zz_newBoolean', text: 'Boolean' },
                    text: 'testclick'
                })
            );
            expect(call[2]).toEqual(1);
            expect(call[3]).toEqual('zz_newBoolean-testclick');
        });

        test('Select edited item by Enter', () => {
            const onChange = jest.fn();
            render(<DropdownEditable options={data} onChange={onChange} />);
            toggleDropdown();
            editItem('testenter', 0, true);
            // Check change callback
            expect(onChange).toBeCalledTimes(1);
            const call = onChange.mock.calls[0];
            expect(call[1]).toEqual(
                expect.objectContaining({
                    editable: true,
                    key: 'zz_newBoolean-testenter',
                    subValue: { key: 'zz_newBoolean', text: 'Boolean' },
                    text: 'testenter'
                })
            );
            expect(call[2]).toEqual(1);
            expect(call[3]).toEqual('zz_newBoolean-testenter');
        });

        test('Select edited item by closing menu', () => {
            const onChange = jest.fn();
            render(<DropdownEditable options={data} onChange={onChange} />);
            toggleDropdown();
            editItem('testDelay', 0);
            toggleDropdown();
            // Check change callback
            expect(onChange).toBeCalledTimes(1);
            const call = onChange.mock.calls[0];
            expect(call[1]).toEqual(
                expect.objectContaining({
                    editable: true,
                    key: 'zz_newBoolean-testDelay',
                    subValue: { key: 'zz_newBoolean', text: 'Boolean' },
                    text: 'testDelay'
                })
            );
            expect(call[2]).toEqual(undefined);
            expect(call[3]).toEqual('zz_newBoolean-testDelay');
        });

        test('Select invalid edited item', () => {
            const onChange = jest.fn();
            render(<DropdownEditable options={data} onChange={onChange} />);
            toggleDropdown();
            editItem('#wrong', 0);
            clickOnDropdownItem(1);
            // Check change callback
            expect(onChange).toBeCalledTimes(0);
        });

        test('Select empty edited item', () => {
            const onChange = jest.fn();
            render(<DropdownEditable options={data} onChange={onChange} />);
            toggleDropdown();
            editItem('', 0);
            clickOnDropdownItem(1);
            // Check change callback
            expect(onChange).toBeCalledTimes(0);
        });

        test('Select subvalue', () => {
            const onChange = jest.fn();
            render(<DropdownEditable options={data} onChange={onChange} />);
            toggleDropdown();
            selectSubvalue(1, 1);
            editItem('testSubvalue', 0, true);
            // Check change callback
            expect(onChange).toBeCalledTimes(1);
            const call = onChange.mock.calls[0];
            expect(call[1]).toEqual(
                expect.objectContaining({
                    editable: true,
                    key: 'zz_newDate-testSubvalue',
                    text: 'testSubvalue'
                })
            );
            expect(call[2]).toEqual(1);
            expect(call[3]).toEqual('zz_newDate-testSubvalue');
        });
    });

    describe('Multi edit', () => {
        test('Render', () => {
            render(<DropdownEditable options={data} multiSelect={true} />);
            toggleDropdown();
            // Check all menu items
            expect(document.querySelectorAll(selectors.dropdownMenuItem).length).toEqual(2);
            // Check editable menu items
            expect(document.querySelectorAll(selectors.dropdownMenuEditableItem).length).toEqual(1);
        });

        test('Item edited', () => {
            const onChange = jest.fn();
            render(<DropdownEditable options={data} onChange={onChange} multiSelect={true} />);
            toggleDropdown();
            editItem('testEdit', 0);
            // Check all menu items
            expect(document.querySelectorAll(selectors.dropdownMenuItem).length).toEqual(3);
            // Check editable menu items
            expect(document.querySelectorAll(selectors.dropdownMenuEditableItem).length).toEqual(2);
            // Check change callback
            expect(onChange).toBeCalledTimes(1);
            const call = onChange.mock.calls[0];
            expect(call[1]).toEqual(
                expect.objectContaining({
                    editable: true,
                    key: 'zz_newBoolean-testEdit',
                    subValue: { key: 'zz_newBoolean', text: 'Boolean' },
                    text: 'testEdit'
                })
            );
            expect(call[2]).toEqual(1);
            expect(call[3]).toEqual('zz_newBoolean-testEdit');
        });

        test('Select subvalue', () => {
            const onChange = jest.fn();
            render(<DropdownEditable options={data} onChange={onChange} multiSelect={true} />);
            toggleDropdown();
            selectSubvalue(1, 1);
            editItem('testSubvalue', 0, true);
            // Check change callback
            expect(onChange).toBeCalledTimes(1);
            const call = onChange.mock.calls[0];
            expect(call[1]).toEqual(
                expect.objectContaining({
                    editable: true,
                    key: 'zz_newDate-testSubvalue',
                    text: 'testSubvalue'
                })
            );
            expect(call[2]).toEqual(1);
            expect(call[3]).toEqual('zz_newDate-testSubvalue');
        });
    });

    describe('Test submenu', () => {
        test('Open and close sub menu', () => {
            const onChange = jest.fn();
            render(<DropdownEditable options={data} onChange={onChange} />);
            toggleDropdown();

            // Open submenu
            const item = getItemByIndex(1);
            fireEvent.mouseOver(item);
            // Check submenu
            const subMenuCallout = document.querySelector(selectors.subMenuCallout) as HTMLElement;
            const subItems = getSubMenuItems();
            expect(subItems.length).toEqual(3);
            // Hide submenu on mouse leave
            fireEvent.mouseLeave(subMenuCallout);
            expect(document.querySelectorAll(selectors.subMenuCallout).length).toEqual(0);
        });

        test('Prevent root dropdown menu close when selecting item from submenu', async () => {
            const onChange = jest.fn();
            render(<DropdownEditable options={data} onChange={onChange} />);
            toggleDropdown();
            await new Promise((resolve) => setTimeout(resolve, 0));
            selectSubvalue(1, 1);
            editItem('testSubvalue', 0, true);
            // Check change callback
            expect(onChange).toBeCalledTimes(1);
            const call = onChange.mock.calls[0];
            expect(call[1]).toEqual(
                expect.objectContaining({
                    editable: true,
                    key: 'zz_newDate-testSubvalue',
                    text: 'testSubvalue'
                })
            );
            expect(call[2]).toEqual(1);
            expect(call[3]).toEqual('zz_newDate-testSubvalue');
        });

        test('Prevent root dropdown menu close when click inside submenu', async () => {
            const onChange = jest.fn();
            render(<DropdownEditable options={data} onChange={onChange} />);
            toggleDropdown();
            await new Promise((resolve) => setTimeout(resolve, 0));
            // Open submenu
            const item = getItemByIndex(1);
            fireEvent.mouseOver(item);
            const submenuCallouts = document.querySelectorAll(selectors.subMenuCallout);
            expect(submenuCallouts.length).toEqual(1);

            // Click within submenu callout
            fireEvent.click(submenuCallouts[0]);
            // Check if submenu still visible
            expect(document.querySelectorAll(selectors.subMenuCallout).length).toEqual(1);
        });
    });
});
