import * as React from 'react';
import * as Enzyme from 'enzyme';

import type {
    UIFlexibleTableProps,
    UIFlexibleTableColumnType,
    UIFlexibleTableRowType,
    CellRendererResult,
    CellRendererParams,
    TitleCellRendererParams
} from '../../../src/components';

import { initIcons, UIFlexibleTable, UIFlexibleTableLayout, getRowActionButtonId } from '../../../src/components';

import { mockResizeObserver } from '../../utils/utils';

initIcons();

mockResizeObserver();

const delay = async (time: number) => {
    await new Promise((resolve) => {
        setTimeout(() => {
            resolve(null);
        }, time);
    });
};

describe('<UIFlexibleTable />', () => {
    const selectors = {
        tableRoot: '.flexible-table',
        tableWrappingLayout: '.flexible-table.wrapping-layout',
        tableHeaderPrimaryAction: '.flexible-table-header-primary-actions .flexible-table-header-action',
        tableHeaderSecondaryAction: '.flexible-table-header-secondary-actions .flexible-table-header-action',
        content: '.flexible-table-content-table',
        row: '.flexible-table-content-table-row',
        rowHeader: '.flexible-table-content-table-row-header',
        rowTitleContainer: '.flexible-table-content-table-row-header-text-content',
        rowHeaderActionsContainer: 'div.flexible-table-content-table-row-header-actions',
        rowActionsContainer: '.flexible-table-content-table-row-item-actions',
        rowActionWrapper: '.flexible-table-content-table-row-item-actions-item-wrapper',
        titleRow: '.flexible-table-content-table-title-row',
        titleRowValue: '.flexible-table-content-table-title-row-item-data-cells-value',
        titleRowActions: '.flexible-table-content-table-title-row-item-actions',
        indexColumn: '.flexible-table-content-table-row-item-index',
        indexColumnValue: '.flexible-table-content-table-row-item-index-value',
        indexColumnTitle: '.flexible-table-content-table-title-row-item-index-value',
        indexColumnTitleCustom: '.flexible-table-content-table-title-row-item-index',
        rowDataCells: '.flexible-table-content-table-row-item-data-cells',
        cellTitle: '.flexible-table-content-table-row-item-title',
        cellValueMain: '.flexible-table-content-table-row-item-data-cells-value',
        addButton: 'button.flexible-table-btn-add',
        deleteButton: `button.flexible-table-content-table-row-item-actions-delete`,
        upArrow: 'button.flexible-table-content-table-row-item-actions-up',
        downArrow: 'button.flexible-table-content-table-row-item-actions-down',
        reverseBackground: '.reverse-background',
        nthDownArrow: (n: number) => `#flexible-table-content-table-row-${n}-actions-down`
    };

    const onRenderCell: (params: CellRendererParams<number>) => CellRendererResult = (params) => ({
        content: params.value,
        cellClassNames: `cell-value-${params.rowKey}-${params.colKey}`
    });

    const columns: UIFlexibleTableColumnType[] = [
        { key: 'col1', title: 'Column 1', className: 'col1-class' },
        { key: 'col2', title: 'Column 2', className: 'col2-class' },
        { key: 'col3', title: 'Column 3', className: 'col3-class', hidden: true }
    ];
    const rows: UIFlexibleTableRowType<number>[] = [
        { key: '1', cells: { col1: 11, col2: 12, col3: 13 }, title: 'Row 1' },
        { key: '2', cells: { col1: 21, col2: 22, col3: 23 }, title: 'Row 1' },
        { key: '3', cells: { col1: 31, col2: 32, col3: 33 }, title: 'Row 3' }
    ];

    const tableId = 'dummy-table-id';

    describe('InlineFlex layout', () => {
        let wrapper: Enzyme.ReactWrapper<UIFlexibleTableProps<number>>;

        beforeEach(() => {
            wrapper = Enzyme.mount(
                <UIFlexibleTable
                    layout={UIFlexibleTableLayout.InlineFlex}
                    id={tableId}
                    columns={columns}
                    rows={rows}
                    onRenderCell={onRenderCell}
                    onTableReorder={() => {
                        return;
                    }}
                    onRenderReorderActions={() => {
                        return {};
                    }}
                />
            );
        });

        afterEach(() => {
            jest.clearAllMocks();
            wrapper.unmount();
        });

        it('Render default', () => {
            expect(wrapper.exists()).toEqual(true);
            expect(wrapper.find(selectors.content).length).toEqual(1);
            expect(wrapper.find(selectors.addButton).length).toEqual(0);
            const rowObjects = wrapper.find(selectors.row);
            expect(rowObjects.length).toEqual(3);
            expect(wrapper.find(selectors.titleRow).length).toEqual(0);

            // check content
            rowObjects.forEach((row, rowIndex) => {
                columns.forEach((col) => {
                    const selector = `.cell-value-${rows[rowIndex].key}-${col.key} ${selectors.cellValueMain}`;
                    const dataCellsFound = row.find(selector);

                    expect(dataCellsFound.length).toBe(col.hidden ? 0 : 1);
                    if (!col.hidden) {
                        const cell = dataCellsFound.get(0);
                        expect(cell.props.children).toBe(rows[rowIndex].cells[col.key]);
                    }
                });
            });
            expect(wrapper.find(selectors.reverseBackground).length).toEqual(0);
        });

        it('Render index column', () => {
            wrapper.setProps({ showIndexColumn: true });
            const indexCells = wrapper.find(selectors.indexColumn);
            expect(indexCells.length).toEqual(3);
            indexCells.forEach((cell, idx) => {
                const value = cell.find(selectors.indexColumnValue);
                expect(value.get(0).props.children).toBe(rows[idx].key);
            });
        });

        it('Render column default titles', () => {
            wrapper.setProps({ showIndexColumn: true, showColumnTitles: true });
            const headersFound = wrapper.find(selectors.titleRow);
            expect(headersFound.length).toEqual(1);

            const indexTitleFound = wrapper.find(selectors.indexColumnTitle);
            expect(indexTitleFound.length).toBe(1);
            expect(indexTitleFound.get(0).props.children).toBe('#');

            const titleCells = wrapper.find(selectors.titleRowValue);
            expect(titleCells.length).toBe(2);

            columns
                .filter((col) => !col.hidden)
                .forEach((col, idx) => {
                    expect(titleCells.get(idx).key).toBe(`title-cell-${col.key}-${idx}`);
                    expect(titleCells.get(idx).props.children).toBe(col.title);
                });
        });

        it('Render column titles in cells', () => {
            wrapper.setProps({ showIndexColumn: true, showColumnTitles: true, showColumnTitlesInCells: true });
            const headersFound = wrapper.find(selectors.titleRow);
            expect(headersFound.length).toEqual(0);

            const titleCells = wrapper.find(selectors.cellTitle);
            expect(titleCells.length).toBe(6);

            rows.forEach((row, rIdx) => {
                columns
                    .filter((col) => !col.hidden)
                    .forEach((col, idx) => {
                        expect(titleCells.get(rIdx * 2 + idx).props.children).toBe(col.title);
                    });
            });
        });

        it('Render column custom titles', () => {
            wrapper.setProps({
                showIndexColumn: true,
                showColumnTitles: true,
                onRenderTitleColumnCell: (params: TitleCellRendererParams) => {
                    if (params.isIndexColumn) {
                        return { content: 'id', cellClassNames: 'custom-id' };
                    } else if (params.isActionsColumn) {
                        return { content: 'Actions', cellClassNames: 'custom-actions' };
                    } else {
                        return {
                            content: columns[params.colIndex || 0].title + ' title',
                            cellClassNames: ['custom-title', `col-${params.colKey}`]
                        };
                    }
                }
            });
            const headersFound = wrapper.find(selectors.titleRow);
            expect(headersFound.length).toEqual(1);

            const indexTitleFound = wrapper.find(selectors.indexColumnTitleCustom);
            expect(indexTitleFound.length).toBe(1);
            expect(indexTitleFound.get(0).props.children).toBe('id');
            expect(indexTitleFound.get(0).props.className).toBe(
                'flexible-table-content-table-title-row-item-index custom-id'
            );

            const actionsTitleFound = wrapper.find(selectors.titleRowActions);
            expect(actionsTitleFound.length).toBe(1);
            expect(actionsTitleFound.get(0).props.children).toBe('Actions');
            expect(actionsTitleFound.get(0).props.className).toBe(
                'flexible-table-content-table-title-row-item-actions custom-actions'
            );

            const titleCells = wrapper.find(selectors.titleRowValue);
            expect(titleCells.length).toBe(2);

            columns
                .filter((col) => !col.hidden)
                .forEach((col, idx) => {
                    expect(titleCells.get(idx).props.children).toBe(col.title + ' title');
                });
        });

        it('Render custom row content', () => {
            wrapper.setProps({
                onRenderRowDataContent: (params) => {
                    return params.rowIndex === 1 ? <div id="custom-row">This is too complex row</div> : undefined;
                }
            });

            const rowDataObjects = wrapper.find(selectors.rowDataCells);
            expect(rowDataObjects.length).toEqual(3);

            const rowObjects = wrapper.find(selectors.row);
            expect(rowObjects.length).toEqual(3);
            expect(wrapper.find(selectors.titleRow).length).toEqual(0);

            // check content
            rowObjects.forEach((row, rowIndex) => {
                if (rowIndex === 1) {
                    const selector = selectors.rowDataCells;
                    const content = row.find(`${selector} #custom-row`);
                    expect(content.length).toBe(1);
                    expect(content.getElement().props).toMatchInlineSnapshot(`
                        Object {
                          "children": "This is too complex row",
                          "id": "custom-row",
                        }
                    `);
                } else {
                    columns.forEach((col) => {
                        const selector = `.cell-value-${rows[rowIndex].key}-${col.key} ${selectors.cellValueMain}`;
                        const dataCellsFound = row.find(selector);

                        expect(dataCellsFound.length).toBe(col.hidden ? 0 : 1);
                        if (!col.hidden) {
                            const cell = dataCellsFound.get(0);
                            expect(cell.props.children).toBe(rows[rowIndex].cells[col.key]);
                        }
                    });
                }
            });
        });

        it('Render with limited width', () => {
            wrapper.setProps({
                maxWidth: 1000
            });
            const root = wrapper.find(selectors.tableRoot);
            expect(root.length).toEqual(1);
            expect(root.getElement().props.style).toMatchInlineSnapshot(`
                Object {
                  "maxWidth": "1000px",
                }
            `);

            wrapper.setProps({
                maxWidth: undefined
            });
            wrapper.update();
            const root2 = wrapper.find(selectors.tableRoot);
            expect(root2.getElement().props.style).toMatchInlineSnapshot(`
                Object {
                  "maxWidth": "100%",
                }
            `);
        });

        it('onRenderRowContainer ', () => {
            wrapper.setProps({
                onRenderRowContainer: (params) => {
                    return params.rowIndex === 2 ? { isDropWarning: true } : { isDropWarning: false };
                }
            });

            const rowDataObjects = wrapper.find(selectors.rowDataCells);
            expect(rowDataObjects.length).toEqual(3);

            const rowObjects = wrapper.find(selectors.row);
            expect(rowObjects.length).toEqual(3);

            // check warning class added
            rowObjects.forEach((row, rowIndex) => {
                expect(
                    row.getElement().props.className.includes('highlight-drop-warning') === (rowIndex === 2)
                ).toBeTruthy();
            });
        });

        it('Property "reverseBackground"', () => {
            wrapper.setProps({
                reverseBackground: true
            });
            expect(wrapper.find(selectors.reverseBackground).length).toEqual(3);
            wrapper.setProps({
                reverseBackground: false
            });
            expect(wrapper.find(selectors.reverseBackground).length).toEqual(0);
        });

        describe('Add button', () => {
            const onAddClick = jest.fn().mockImplementation(() => ({ scrollToRow: 1 }));
            it('enabled', () => {
                Element.prototype.scrollIntoView = jest.fn();
                const scrollSpy = jest.spyOn(Element.prototype, 'scrollIntoView');
                wrapper.setProps({
                    addRowButton: { label: 'Add New Item', onClick: onAddClick }
                });
                expect(wrapper.find(selectors.addButton).length).toEqual(1);
                wrapper.find(selectors.addButton).first().simulate('click');
                expect(onAddClick.mock.calls.length).toEqual(1);
                wrapper.setProps({ isContentLoading: true });
                wrapper.setProps({ isContentLoading: false });
                expect(scrollSpy).toHaveBeenCalled();
                expect((scrollSpy.mock.instances[0] as any).parentElement.attributes.getNamedItem('id').value).toBe(
                    'row-1'
                );
            });
            it('readonly - off', () => {
                wrapper.setProps({
                    addRowButton: { label: 'Add New Item', title: 'Read only reason', onClick: onAddClick },
                    readonly: true
                });
                const foundButtons = wrapper.find(selectors.addButton);
                expect(foundButtons.length).toEqual(1);
                expect(foundButtons.get(0).props.disabled).toBeTruthy();
                expect(foundButtons.get(0).props.title).toBe('Read only reason');
            });
            it('disabled', () => {
                wrapper.setProps({
                    addRowButton: { label: 'Add New Item', onClick: onAddClick },
                    isAddItemDisabled: true
                });
                const foundButtons = wrapper.find(selectors.addButton);
                expect(foundButtons.length).toEqual(1);
                expect(foundButtons.get(0).props.disabled).toBeTruthy();
            });
            it('omitted', () => {
                wrapper.setProps({
                    addRowButton: undefined
                });
                const foundButtons = wrapper.find(selectors.addButton);
                expect(foundButtons.length).toEqual(0);
            });
        });

        describe('custom table actions', () => {
            const renderSpy = jest.fn().mockImplementation((params: { readonly: boolean }) => [
                <div key="1" id="action1">
                    {params.readonly ? 'read1' : 'write1'}
                </div>,
                <div key="2" id="action2">
                    {params.readonly ? 'read2' : 'write2'}
                </div>
            ]);
            beforeEach(() => renderSpy.mockClear());

            it('primary actions', () => {
                wrapper.setProps({
                    onRenderPrimaryTableActions: renderSpy
                });
                wrapper.update();
                const actions = wrapper.find(selectors.tableHeaderPrimaryAction);
                expect(actions.length).toBe(2);
                expect(actions.map((item) => item.getElement().props.children)).toMatchInlineSnapshot(`
                    Array [
                      <div
                        id="action1"
                      >
                        write1
                      </div>,
                      <div
                        id="action2"
                      >
                        write2
                      </div>,
                    ]
                `);
            });

            it('secondary actions', () => {
                wrapper.setProps({
                    onRenderSecondaryTableActions: renderSpy
                });
                wrapper.update();
                const actions = wrapper.find(selectors.tableHeaderSecondaryAction);
                expect(actions.length).toBe(2);
                expect(actions.map((item) => item.getElement().props.children)).toMatchInlineSnapshot(`
                    Array [
                      <div
                        id="action1"
                      >
                        write1
                      </div>,
                      <div
                        id="action2"
                      >
                        write2
                      </div>,
                    ]
                `);
            });

            it('readonly actions', () => {
                wrapper.setProps({
                    onRenderPrimaryTableActions: renderSpy,
                    readonly: true
                });
                wrapper.update();
                const actions = wrapper.find(selectors.tableHeaderPrimaryAction);
                expect(actions.length).toBe(2);
                expect(actions.map((item) => item.getElement().props.children)).toMatchInlineSnapshot(`
                    Array [
                      <div
                        id="action1"
                      >
                        read1
                      </div>,
                      <div
                        id="action2"
                      >
                        read2
                      </div>,
                    ]
                `);
            });
        });

        describe('Delete row buttons', () => {
            const onAddClick = jest.fn();
            const onDeleteClick = jest.fn();
            it('enabled', () => {
                wrapper.setProps({
                    addRowButton: { label: 'Add New Item', onClick: onAddClick },
                    onDeleteRow: onDeleteClick
                });
                expect(wrapper.find(selectors.deleteButton).length).toEqual(3);
                wrapper.find(selectors.deleteButton).last().simulate('click');
                expect(onDeleteClick.mock.calls.length).toEqual(1);
                expect(onDeleteClick.mock.calls[0][0].rowIndex).toEqual(2);
            });
            it('tooltip', () => {
                wrapper.setProps({
                    addRowButton: { label: 'Add New Item', onClick: onAddClick },
                    onDeleteRow: onDeleteClick,
                    onRenderDeleteAction: ({ rowIndex }) => {
                        return {
                            isDeleteDisabled: rowIndex > 0,
                            tooltip: rowIndex > 0 ? 'Tooltip for disabled' : 'Tooltip for enabled'
                        };
                    }
                });
                const foundButtons = wrapper.find(selectors.deleteButton);
                expect(foundButtons.length).toEqual(3);
                foundButtons.forEach((button, idx) => {
                    expect(button.getElement().props.title).toBe(
                        idx > 0 ? 'Tooltip for disabled' : 'Tooltip for enabled'
                    );
                });
            });
            it('readonly - off', () => {
                wrapper.setProps({
                    addRowButton: { label: 'Add', onClick: onAddClick },
                    onDeleteRow: onDeleteClick,
                    readonly: true
                });
                expect(wrapper.find(selectors.deleteButton).length).toEqual(0);
            });
            it('disabled', () => {
                wrapper.setProps({
                    addRowButton: { label: 'Add', onClick: onAddClick },
                    onDeleteRow: onDeleteClick,
                    onRenderDeleteAction: ({ rowIndex }) => {
                        return {
                            isDeleteDisabled: rowIndex > 0
                        };
                    }
                });
                const foundButtons = wrapper.find(selectors.deleteButton);
                expect(foundButtons.length).toEqual(3);
                foundButtons.forEach((button, idx) => {
                    expect(button.getElement().props.disabled).toBe(idx > 0 ? true : undefined);
                });
            });
        });

        describe('reorder buttons', () => {
            it('render', () => {
                wrapper.setProps({
                    onTableReorder: () => {
                        return;
                    }
                });
                const upButtonsFound = wrapper.find(selectors.upArrow);
                const downButtonsFound = wrapper.find(selectors.downArrow);
                expect(upButtonsFound.length).toBe(3);
                expect(downButtonsFound.length).toBe(3);
                upButtonsFound.forEach((button, idx) => {
                    expect(button.getElement().props.className.includes('is-disabled') === (idx === 0)).toBeTruthy();
                });
                downButtonsFound.forEach((button, idx) => {
                    expect(button.getElement().props.className.includes('is-disabled') === (idx === 2)).toBeTruthy();
                });
            });
            it('move up/down not rendered', () => {
                wrapper.setProps({
                    onTableReorder: undefined
                });
                const upButtonsFound = wrapper.find(selectors.upArrow);
                const downButtonsFound = wrapper.find(selectors.downArrow);
                expect(upButtonsFound.length).toBe(0);
                expect(downButtonsFound.length).toBe(0);
            });

            it('move up/down disabled for new line item index 1(2nd row) with tooltip', () => {
                wrapper.setProps({
                    onTableReorder: () => {
                        return;
                    },
                    onRenderReorderActions: (params) => {
                        const isRow2 = params.rowIndex === 1;
                        return {
                            up: {
                                disabled: isRow2,
                                tooltip: isRow2 ? 'Testing move up disabled' : ''
                            },
                            down: {
                                disabled: isRow2,
                                tooltip: isRow2 ? 'Testing move down disabled' : ''
                            }
                        };
                    }
                });
                const upButtonsFound = wrapper.find(selectors.upArrow);
                const downButtonsFound = wrapper.find(selectors.downArrow);
                expect(upButtonsFound.length).toBe(3);
                expect(downButtonsFound.length).toBe(3);
                upButtonsFound.forEach((button, idx) => {
                    expect(
                        button.getElement().props.className.includes('is-disabled') === [0, 1].includes(idx)
                    ).toBeTruthy();
                    expect(button.getElement().props.title).toBe(idx === 1 ? 'Testing move up disabled' : '');
                });
                downButtonsFound.forEach((button, idx) => {
                    expect(
                        button.getElement().props.className.includes('is-disabled') === [1, 2].includes(idx)
                    ).toBeTruthy();
                    expect(button.getElement().props.title).toBe(idx === 1 ? 'Testing move down disabled' : '');
                });
            });
            it('readonly - off', () => {
                wrapper.setProps({
                    onTableReorder: () => {
                        return;
                    },
                    readonly: true
                });
                const upButtonsFound = wrapper.find(selectors.upArrow);
                const downButtonsFound = wrapper.find(selectors.downArrow);
                expect(upButtonsFound.length).toBe(0);
                expect(downButtonsFound.length).toBe(0);
            });
            it('no handler - off', () => {
                wrapper.setProps({
                    onTableReorder: undefined
                });
                const upButtonsFound = wrapper.find(selectors.upArrow);
                const downButtonsFound = wrapper.find(selectors.downArrow);
                expect(upButtonsFound.length).toBe(0);
                expect(downButtonsFound.length).toBe(0);
            });

            it('click down button', async () => {
                const onReorder = jest.fn();
                wrapper.setProps({
                    onTableReorder: onReorder
                });

                const downButtonsFound = wrapper.find(selectors.downArrow);
                const button = downButtonsFound.first();
                button.simulate('focus');

                const dummyButton = document.createElement('button');
                const focusSpy = jest.spyOn(dummyButton, 'focus');
                let idMismatches = 0;
                const getByIdSpy = jest.spyOn(document, 'getElementById').mockImplementation((id) => {
                    if (id === getRowActionButtonId(tableId, 1, 'down')) {
                        return dummyButton;
                    }
                    idMismatches++;
                    return null;
                });

                button.simulate('click');
                wrapper.setProps({ isContentLoading: true });
                await delay(200);
                wrapper.setProps({ isContentLoading: false });
                getByIdSpy.mockRestore();

                expect(onReorder.mock.calls.length).toBe(1);
                expect(onReorder.mock.calls[0][0]).toStrictEqual({ oldIndex: 0, newIndex: 1 });
                expect(focusSpy).toBeCalledTimes(2);
                expect(idMismatches).toBe(0);
                // Focus should not be reseted anymore
                focusSpy.mockReset();
                const root = wrapper.find(selectors.tableRoot);
                root.simulate('blur');
                wrapper.setProps({ isContentLoading: true });
                await delay(200);
                wrapper.setProps({ isContentLoading: false });
                expect(focusSpy).toBeCalledTimes(0);
            });

            it('click last available down button', async () => {
                const onReorder = jest.fn();
                wrapper.setProps({
                    onTableReorder: onReorder
                });

                const downButtonsFound = wrapper.find(selectors.downArrow);
                const button = downButtonsFound.first();
                button.simulate('focus');

                const dummyButton = document.createElement('button');
                const focusSpy = jest.spyOn(dummyButton, 'focus');
                let idMismatches = 0;
                let downIds = 0;
                let upIds = 0;
                const getByIdSpy = jest.spyOn(document, 'getElementById').mockImplementation((id) => {
                    if (id === getRowActionButtonId(tableId, 1, 'down')) {
                        downIds++;
                        dummyButton.setAttribute('disabled', 'true');
                        return dummyButton;
                    }
                    if (id === getRowActionButtonId(tableId, 1, 'up')) {
                        upIds++;
                        dummyButton.removeAttribute('disabled');
                        return dummyButton;
                    }
                    idMismatches++;
                    return null;
                });

                button.simulate('click');
                wrapper.setProps({ isContentLoading: true });
                await delay(200);
                wrapper.setProps({ isContentLoading: false });
                expect(getByIdSpy).toHaveBeenCalledTimes(4);
                getByIdSpy.mockRestore();

                expect(onReorder.mock.calls.length).toBe(1);
                expect(onReorder.mock.calls[0][0]).toStrictEqual({ oldIndex: 0, newIndex: 1 });
                expect(focusSpy).toHaveBeenCalled();
                expect(idMismatches).toBe(0);
                expect(downIds).toBe(2);
                expect(upIds).toBe(2);
            });

            it('click up button', async () => {
                const onReorder = jest.fn();
                wrapper.setProps({
                    onTableReorder: onReorder
                });

                const upButtonsFound = wrapper.find(selectors.upArrow);
                const button = upButtonsFound.last();
                button.simulate('focus');

                const dummyButton = document.createElement('button');
                const focusSpy = jest.spyOn(dummyButton, 'focus');
                let idMismatches = 0;
                const getByIdSpy = jest.spyOn(document, 'getElementById').mockImplementation((id) => {
                    if (id === getRowActionButtonId(tableId, 1, 'up')) {
                        return dummyButton;
                    }
                    idMismatches++;
                    return null;
                });

                button.simulate('click');
                wrapper.setProps({ isContentLoading: true });
                await delay(200);
                wrapper.setProps({ isContentLoading: false });
                getByIdSpy.mockRestore();

                expect(onReorder.mock.calls.length).toBe(1);
                expect(onReorder.mock.calls[0][0]).toStrictEqual({ oldIndex: 2, newIndex: 1 });
                expect(focusSpy).toHaveBeenCalled();
                expect(idMismatches).toBe(0);
            });

            it('click last available up button', async () => {
                const onReorder = jest.fn();
                wrapper.setProps({
                    onTableReorder: onReorder
                });

                const upButtonsFound = wrapper.find(selectors.upArrow);
                const button = upButtonsFound.last();
                button.simulate('focus');

                const dummyButton = document.createElement('button');
                const focusSpy = jest.spyOn(dummyButton, 'focus');
                let idMismatches = 0;
                let downIds = 0;
                let upIds = 0;
                const getByIdSpy = jest.spyOn(document, 'getElementById').mockImplementation((id) => {
                    if (id === getRowActionButtonId(tableId, 1, 'up')) {
                        downIds++;
                        dummyButton.setAttribute('disabled', 'true');
                        return dummyButton;
                    }
                    if (id === getRowActionButtonId(tableId, 1, 'down')) {
                        upIds++;
                        dummyButton.removeAttribute('disabled');
                        return dummyButton;
                    }
                    idMismatches++;
                    return null;
                });

                button.simulate('click');
                wrapper.setProps({ isContentLoading: true });
                await delay(200);
                wrapper.setProps({ isContentLoading: false });
                expect(getByIdSpy).toHaveBeenCalledTimes(4);
                getByIdSpy.mockRestore();

                expect(onReorder.mock.calls.length).toBe(1);
                expect(onReorder.mock.calls[0][0]).toStrictEqual({ oldIndex: 2, newIndex: 1 });
                expect(focusSpy).toHaveBeenCalled();
                expect(idMismatches).toBe(0);
                expect(downIds).toBe(2);
                expect(upIds).toBe(2);
            });
        });
    });

    describe('Wrapping layout', () => {
        let wrapper: Enzyme.ReactWrapper<UIFlexibleTableProps<number>>;

        beforeEach(() => {
            wrapper = Enzyme.mount(
                <UIFlexibleTable
                    layout={UIFlexibleTableLayout.Wrapping}
                    id={tableId}
                    columns={columns}
                    rows={rows}
                    onRenderCell={onRenderCell}
                    onTableReorder={() => {
                        return;
                    }}
                    showColumnTitles={true}
                />
            );
        });

        afterEach(() => {
            jest.clearAllMocks();
            wrapper.unmount();
        });

        it('Render default', () => {
            expect(wrapper.exists()).toEqual(true);
            expect(wrapper.find(selectors.tableWrappingLayout).length).toEqual(1);
            expect(wrapper.find(selectors.content).length).toEqual(1);
            expect(wrapper.find(selectors.addButton).length).toEqual(0);
            const rowObjects = wrapper.find(selectors.row);
            expect(rowObjects.length).toEqual(3);
            const rowHeaderObjects = wrapper.find(selectors.rowHeader);
            expect(rowHeaderObjects.length).toEqual(3);
            expect(wrapper.find(selectors.titleRow).length).toEqual(0);

            // check content
            rowObjects.forEach((row, rowIndex) => {
                columns.forEach((col) => {
                    // check row title
                    const rowTitle = row.find(selectors.rowTitleContainer);
                    expect(rowTitle.get(0).props.children).toBe(rows[rowIndex].title);

                    // check row default actions
                    const rowActions = row.find(selectors.rowHeaderActionsContainer);
                    expect(rowActions.length).toBe(1);
                    const actions = rowActions
                        .first()
                        .find('UIFlexibleTableRowActionButton')
                        .getElements()
                        .map((i) => i.props.actionName);
                    expect(actions).toEqual(['up', 'down']);

                    // check data cells
                    const selector = `.cell-value-${rows[rowIndex].key}-${col.key} ${selectors.cellValueMain}`;
                    const dataCellsFound = row.find(selector);
                    expect(dataCellsFound.length).toBe(col.hidden ? 0 : 1);
                    if (!col.hidden) {
                        const cell = dataCellsFound.get(0);
                        expect(cell.props.children).toBe(rows[rowIndex].cells[col.key]);
                    }
                });
            });
        });

        it('Render delete actions on header', () => {
            wrapper.setProps({
                onDeleteRow: () => null,
                onRenderDeleteAction: (params) => ({ isDeleteDisabled: params.rowIndex === 1 })
            });
            const rowObjects = wrapper.find(selectors.row);
            rowObjects.forEach((row, rowIndex) => {
                const action = row.find(
                    `${selectors.rowHeaderActionsContainer} ${selectors.rowActionWrapper} ${selectors.deleteButton}`
                );
                expect(action.length).toBe(1);
                const disabled = action.getElement().props.disabled;
                expect(!!disabled).toEqual(rowIndex === 1);
            });
        });

        it('Render custom row actions on header', () => {
            wrapper.setProps({
                onRenderActions: (params) => [
                    <div key="action" className="testAction">
                        {params.rowKey}
                    </div>
                ]
            });
            const rowObjects = wrapper.find(selectors.row);
            rowObjects.forEach((row, rowIndex) => {
                const action = row.find(
                    `${selectors.rowHeaderActionsContainer} ${selectors.rowActionWrapper} .testAction`
                );
                expect(action.length).toBe(1);
                expect(action.get(0).props.children).toBe((rowIndex + 1).toString());
            });
        });

        it('Add button click and scroll to target row after adding', () => {
            const onAddClick = jest.fn().mockImplementation(() => ({ scrollToRow: 1 }));
            Element.prototype.scrollIntoView = jest.fn();
            const scrollSpy = jest.spyOn(Element.prototype, 'scrollIntoView');
            wrapper.setProps({ addRowButton: { label: 'Add', onClick: onAddClick } });
            expect(wrapper.find(selectors.addButton).length).toEqual(1);
            wrapper.find(selectors.addButton).first().simulate('click');
            expect(onAddClick.mock.calls.length).toEqual(1);
            wrapper.setProps({ isContentLoading: true });
            wrapper.setProps({ isContentLoading: false });
            expect(scrollSpy).toHaveBeenCalled();
            expect((scrollSpy.mock.instances[0] as any).parentElement.attributes.getNamedItem('id').value).toBe(
                'row-1'
            );
        });
    });

    describe('InlineFlex layout', () => {
        let wrapper: Enzyme.ReactWrapper<UIFlexibleTableProps<number>>;

        beforeEach(() => {
            wrapper = Enzyme.mount(
                <UIFlexibleTable
                    layout={UIFlexibleTableLayout.InlineFlex}
                    id={tableId}
                    columns={columns}
                    rows={[]}
                    onRenderCell={onRenderCell}
                    onTableReorder={() => {
                        return;
                    }}
                />
            );
        });

        it('"noDataText" as string', () => {
            const noDataText = 'dummy no data';
            wrapper.setProps({
                noDataText
            });
            const noData = wrapper.find('.flexible-table-content-table-row-no-data');
            expect(noData.length).toEqual(1);
            expect(noData.text()).toEqual(noDataText);
        });

        it('"noDataText" as element', () => {
            wrapper.setProps({
                noDataText: <div className="customNoData"></div>
            });
            const noData = wrapper.find('.customNoData');
            expect(noData.length).toEqual(1);
        });

        it('"noRowBackground"', () => {
            const noDataText = 'dummy no data';
            wrapper.setProps({
                noRowBackground: true,
                noDataText
            });
            expect(wrapper.find('.flexible-table-content-table-row-no-data.no-background').length).toEqual(1);
        });

        it('"reverseBackground" ', () => {
            const noDataText = 'dummy no data';
            wrapper.setProps({
                reverseBackground: true,
                noDataText
            });
            expect(wrapper.find('.flexible-table-content-table-row-no-data.reverse-background').length).toEqual(1);
        });
    });
});
