import type { OutlineNode } from '@sap-ux-private/control-property-editor-common';
import { getFilteredModel } from '../../../../src/panels/outline/utils';
import type { FilterOptions } from '../../../../src/slice';
import { FilterName } from '../../../../src/slice';
const getModel = (editable = true, visible = true, toggleParent = false, toggleChildren = false): OutlineNode[] => {
    const model: OutlineNode[] = [
        {
            name: 'one',
            controlId: '01',
            children: [
                {
                    name: 'first child of one',
                    controlId: '01-01',
                    children: [],
                    controlType: 'name.space.first.child.one',
                    editable: toggleChildren ? !toggleChildren : editable,
                    visible: toggleChildren ? !toggleChildren : visible
                },
                {
                    name: 'second child of one',
                    controlId: '01-02',
                    children: [],
                    controlType: 'name.space.second.child.one',
                    editable: toggleChildren ? !toggleChildren : editable,
                    visible: toggleChildren ? !toggleChildren : visible
                }
            ],
            controlType: 'name.space.one',
            editable: toggleParent ? !toggleParent : editable,
            visible: toggleParent ? !toggleParent : visible
        },
        {
            name: 'two',
            controlId: '02',
            children: [],
            controlType: 'name.space.two',
            editable: toggleParent ? !toggleParent : editable,
            visible: toggleParent ? !toggleParent : visible
        },
        {
            name: 'SmartTable',
            controlId: '03',
            children: [],
            controlType: 'sap.ui.comp.smarttable.SmartTable',
            editable: toggleParent ? !toggleParent : editable,
            visible: toggleParent ? !toggleParent : visible
        }
    ];
    return model;
};

describe('utils', () => {
    describe('getFilteredModel', () => {
        describe('query', () => {
            test('no filter condition meet => model without filter is returned', () => {
                const model = getModel();
                const filterOptions: FilterOptions[] = [{ name: FilterName.query, value: '' }];
                const result = getFilteredModel(model, filterOptions);
                expect(result).toEqual(model);
            });
            test('query filter', () => {
                const model = getModel();
                const filterOptions: FilterOptions[] = [{ name: FilterName.query, value: 'first child' }];
                const result = getFilteredModel(model, filterOptions);
                expect(result).toMatchSnapshot();
            });
        });
        describe('focus commonly used', () => {
            test('no filter condition meet => model without filter is returned', () => {
                const model = getModel();
                const filterOptions: FilterOptions[] = [{ name: FilterName.focusCommonlyUsed, value: false }];
                const result = getFilteredModel(model, filterOptions);
                expect(result).toEqual(model);
            });
            test('show', () => {
                const model = getModel(false, true, true, false);
                const filterOptions: FilterOptions[] = [{ name: FilterName.focusCommonlyUsed, value: true }];
                const result = getFilteredModel(model, filterOptions);
                expect(result).toMatchSnapshot();
            });
        });
    });
});
