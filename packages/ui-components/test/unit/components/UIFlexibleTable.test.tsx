import * as React from 'react';
import { render, fireEvent, act } from '@testing-library/react';

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
        noData: '.flexible-table-content-table-row-no-data',
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
        let props: UIFlexibleTableProps<number>;
        let container: HTMLElement;
        let rerender: (ui: React.ReactElement) => void;

        beforeEach(() => {
            props = {
                layout: UIFlexibleTableLayout.InlineFlex,
                id: tableId,
                columns,
                rows,
                onRenderCell,
                onTableReorder: () => {
                    return;
                },
                onRenderReorderActions: () => {
                    return {};
                }
            };
            ({ container, rerender } = render(<UIFlexibleTable {...props} />));
        });

        afterEach(() => {
            jest.clearAllMocks();
        });

        const setProps = (newProps: Partial<UIFlexibleTableProps<number>>) => {
            props = { ...props, ...newProps };
            rerender(<UIFlexibleTable {...props} />);
        };

        it('Render default', () => {
            expect(container.querySelector(selectors.tableRoot)).toBeTruthy();
            expect(container.querySelectorAll(selectors.content).length).toEqual(1);
            expect(container.querySelectorAll(selectors.addButton).length).toEqual(0);
            const rowObjects = container.querySelectorAll(selectors.row);
            expect(rowObjects.length).toEqual(3);
            expect(container.querySelectorAll(selectors.titleRow).length).toEqual(0);

            // check content
            rowObjects.forEach((row, rowIndex) => {
                columns.forEach((col) => {
                    const selector = `.cell-value-${rows[rowIndex].key}-${col.key} ${selectors.cellValueMain}`;
                    const dataCellsFound = row.querySelectorAll(selector);

                    expect(dataCellsFound.length).toBe(col.hidden ? 0 : 1);
                    if (!col.hidden) {
                        expect(dataCellsFound[0].textContent).toBe(String(rows[rowIndex].cells[col.key]));
                    }
                });
            });
            expect(container.querySelectorAll(selectors.reverseBackground).length).toEqual(0);
        });

        it('Render table (no rows)', () => {
            setProps({ noDataText: 'No data.', rows: [] });
            expect(container.querySelector(selectors.tableRoot)).toBeTruthy();
            expect(container.querySelectorAll(selectors.content).length).toEqual(1);
            expect(container.querySelectorAll(selectors.row).length).toEqual(0);
            const noData = container.querySelector(selectors.noData);
            expect(noData).toBeTruthy();
            expect((noData as HTMLElement).style.cursor).toBe('default');
        });

        it('Render index column', () => {
            setProps({ showIndexColumn: true });
            const indexCells = container.querySelectorAll(selectors.indexColumn);
            expect(indexCells.length).toEqual(3);
            indexCells.forEach((cell, idx) => {
                const value = cell.querySelector(selectors.indexColumnValue);
                expect(value?.textContent).toBe(rows[idx].key);
            });
        });

        it('Render column default titles', () => {
            setProps({ showIndexColumn: true, showColumnTitles: true });
            const headersFound = container.querySelectorAll(selectors.titleRow);
            expect(headersFound.length).toEqual(1);

            const indexTitleFound = container.querySelectorAll(selectors.indexColumnTitle);
            expect(indexTitleFound.length).toBe(1);
            expect(indexTitleFound[0].textContent).toBe('#');

            const titleCells = container.querySelectorAll(selectors.titleRowValue);
            expect(titleCells.length).toBe(2);

            const filteredColumns = columns.filter((col) => !col.hidden);
            const expectedIds = filteredColumns.map((c) => `${tableId}-header-column-${c.key}`);

            filteredColumns.forEach((col, idx) => {
                expect(titleCells[idx].getAttribute('id')).toBe(expectedIds[idx]);
                expect(titleCells[idx].textContent).toBe(col.title);
            });
        });

        it('Render column default titles (with spanned cells)', () => {
            setProps({
                showIndexColumn: true,
                showColumnTitles: true,
                onRenderTitleColumnCell: (params) => ({
                    content: columns[params.colIndex || 0].title,
                    isSpan: params.colIndex === 0
                })
            });
            const headersFound = container.querySelectorAll(selectors.titleRow);
            expect(headersFound.length).toEqual(1);

            const titleCells = container.querySelectorAll(selectors.titleRowValue);
            expect(titleCells.length).toBe(1);

            const col = columns[0];
            const expectedId = `${tableId}-header-column-${col.key}`;
            // isSpan=true renders key="title-cell-unknown"
            expect(titleCells[0].getAttribute('id')).toBe(expectedId);
            expect(titleCells[0].textContent).toBe(col.title);
        });

        it('Render column titles in cells', () => {
            setProps({ showIndexColumn: true, showColumnTitles: true, showColumnTitlesInCells: true });
            const headersFound = container.querySelectorAll(selectors.titleRow);
            expect(headersFound.length).toEqual(0);

            const titleCells = container.querySelectorAll(selectors.cellTitle);
            expect(titleCells.length).toBe(6);

            rows.forEach((row, rIdx) => {
                columns
                    .filter((col) => !col.hidden)
                    .forEach((col, idx) => {
                        expect(titleCells[rIdx * 2 + idx].textContent).toBe(col.title);
                    });
            });
        });

        it('Render column custom titles', () => {
            setProps({
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
            const headersFound = container.querySelectorAll(selectors.titleRow);
            expect(headersFound.length).toEqual(1);

            const indexTitleFound = container.querySelectorAll(selectors.indexColumnTitleCustom);
            expect(indexTitleFound.length).toBe(1);
            expect(indexTitleFound[0].textContent).toBe('id');
            expect(indexTitleFound[0].className).toBe('flexible-table-content-table-title-row-item-index custom-id');

            const actionsTitleFound = container.querySelectorAll(selectors.titleRowActions);
            expect(actionsTitleFound.length).toBe(1);
            expect(actionsTitleFound[0].textContent).toBe('Actions');
            expect(actionsTitleFound[0].className).toBe(
                'flexible-table-content-table-title-row-item-actions custom-actions'
            );

            const titleCells = container.querySelectorAll(selectors.titleRowValue);
            expect(titleCells.length).toBe(2);

            columns
                .filter((col) => !col.hidden)
                .forEach((col, idx) => {
                    expect(titleCells[idx].textContent).toBe(col.title + ' title');
                });
        });

        it('Render custom row content', () => {
            setProps({
                onRenderRowDataContent: (params) => {
                    return params.rowIndex === 1 ? <div id="custom-row">This is too complex row</div> : undefined;
                }
            });

            const rowDataObjects = container.querySelectorAll(selectors.rowDataCells);
            expect(rowDataObjects.length).toEqual(3);

            const rowObjects = container.querySelectorAll(selectors.row);
            expect(rowObjects.length).toEqual(3);
            expect(container.querySelectorAll(selectors.titleRow).length).toEqual(0);

            // check content
            rowObjects.forEach((row, rowIndex) => {
                if (rowIndex === 1) {
                    const content = row.querySelector(`${selectors.rowDataCells} #custom-row`);
                    expect(content).toBeTruthy();
                    expect(content?.textContent).toBe('This is too complex row');
                    expect(content?.getAttribute('id')).toBe('custom-row');
                } else {
                    columns.forEach((col) => {
                        const selector = `.cell-value-${rows[rowIndex].key}-${col.key} ${selectors.cellValueMain}`;
                        const dataCellsFound = row.querySelectorAll(selector);

                        expect(dataCellsFound.length).toBe(col.hidden ? 0 : 1);
                        if (!col.hidden) {
                            expect(dataCellsFound[0].textContent).toBe(String(rows[rowIndex].cells[col.key]));
                        }
                    });
                }
            });
        });

        it('Render with limited width', () => {
            setProps({ maxWidth: 1000 });
            const root = container.querySelector(selectors.tableRoot) as HTMLElement;
            expect(root).toBeTruthy();
            expect(root.style.maxWidth).toBe('1000px');

            setProps({ maxWidth: undefined });
            const root2 = container.querySelector(selectors.tableRoot) as HTMLElement;
            expect(root2.style.maxWidth).toBe('100%');
        });

        it('onRenderRowContainer ', () => {
            setProps({
                onRenderRowContainer: (params) => {
                    return params.rowIndex === 2 ? { isDropWarning: true } : { isDropWarning: false };
                }
            });

            const rowDataObjects = container.querySelectorAll(selectors.rowDataCells);
            expect(rowDataObjects.length).toEqual(3);

            const rowObjects = container.querySelectorAll(selectors.row);
            expect(rowObjects.length).toEqual(3);

            // check warning class added
            rowObjects.forEach((row, rowIndex) => {
                expect(row.className.includes('highlight-drop-warning') === (rowIndex === 2)).toBeTruthy();
            });
        });

        it('Property "reverseBackground"', () => {
            setProps({ reverseBackground: true });
            expect(container.querySelectorAll(selectors.reverseBackground).length).toEqual(3);
            setProps({ reverseBackground: false });
            expect(container.querySelectorAll(selectors.reverseBackground).length).toEqual(0);
        });

        describe('Add button', () => {
            const onAddClick = jest.fn().mockImplementation(() => ({ scrollToRow: 1 }));
            it('enabled', () => {
                Element.prototype.scrollIntoView = jest.fn();
                const scrollSpy = jest.spyOn(Element.prototype, 'scrollIntoView');
                setProps({ addRowButton: { label: 'Add New Item', onClick: onAddClick } });
                expect(container.querySelectorAll(selectors.addButton).length).toEqual(1);
                expect(container.querySelector(selectors.addButton)?.getAttribute('aria-label')).toBe('Add New Item');
                fireEvent.click(container.querySelector(selectors.addButton)!);
                expect(onAddClick.mock.calls.length).toEqual(1);
                setProps({ isContentLoading: true });
                setProps({ isContentLoading: false });
                expect(scrollSpy).toHaveBeenCalled();
                expect((scrollSpy.mock.instances[0] as any).parentElement.attributes.getNamedItem('id').value).toBe(
                    'row-1'
                );
            });
            it('readonly - off', () => {
                setProps({
                    addRowButton: { label: 'Add New Item', title: 'Read only reason', onClick: onAddClick },
                    readonly: true
                });
                const foundButtons = container.querySelectorAll(selectors.addButton);
                expect(foundButtons.length).toEqual(1);
                expect((foundButtons[0] as HTMLButtonElement).disabled).toBeTruthy();
                expect(foundButtons[0].getAttribute('title')).toBe('Read only reason');
            });
            it('disabled', () => {
                setProps({
                    addRowButton: { label: 'Add New Item', onClick: onAddClick },
                    isAddItemDisabled: true
                });
                const foundButtons = container.querySelectorAll(selectors.addButton);
                expect(foundButtons.length).toEqual(1);
                expect((foundButtons[0] as HTMLButtonElement).disabled).toBeTruthy();
            });
            it('omitted', () => {
                setProps({ addRowButton: undefined });
                const foundButtons = container.querySelectorAll(selectors.addButton);
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
                setProps({ onRenderPrimaryTableActions: renderSpy });
                const actions = container.querySelectorAll(selectors.tableHeaderPrimaryAction);
                expect(actions.length).toBe(2);
                expect(actions[0].querySelector('#action1')?.textContent).toBe('write1');
                expect(actions[1].querySelector('#action2')?.textContent).toBe('write2');
            });

            it('secondary actions', () => {
                setProps({ onRenderSecondaryTableActions: renderSpy });
                const actions = container.querySelectorAll(selectors.tableHeaderSecondaryAction);
                expect(actions.length).toBe(2);
                expect(actions[0].querySelector('#action1')?.textContent).toBe('write1');
                expect(actions[1].querySelector('#action2')?.textContent).toBe('write2');
            });

            it('readonly actions', () => {
                setProps({ onRenderPrimaryTableActions: renderSpy, readonly: true });
                const actions = container.querySelectorAll(selectors.tableHeaderPrimaryAction);
                expect(actions.length).toBe(2);
                expect(actions[0].querySelector('#action1')?.textContent).toBe('read1');
                expect(actions[1].querySelector('#action2')?.textContent).toBe('read2');
            });
        });

        describe('Delete row buttons', () => {
            const onAddClick = jest.fn();
            const onDeleteClick = jest.fn();
            it('enabled', () => {
                setProps({
                    addRowButton: { label: 'Add New Item', onClick: onAddClick },
                    onDeleteRow: onDeleteClick
                });
                expect(container.querySelectorAll(selectors.deleteButton).length).toEqual(3);
                const deleteButtons = container.querySelectorAll(selectors.deleteButton);
                fireEvent.click(deleteButtons[deleteButtons.length - 1]);
                expect(onDeleteClick.mock.calls.length).toEqual(1);
                expect(onDeleteClick.mock.calls[0][0].rowIndex).toEqual(2);
            });
            it('tooltip', () => {
                setProps({
                    addRowButton: { label: 'Add New Item', onClick: onAddClick },
                    onDeleteRow: onDeleteClick,
                    onRenderDeleteAction: ({ rowIndex }) => {
                        return {
                            isDeleteDisabled: rowIndex > 0,
                            tooltip: rowIndex > 0 ? 'Tooltip for disabled' : 'Tooltip for enabled'
                        };
                    }
                });
                const foundButtons = container.querySelectorAll(selectors.deleteButton);
                expect(foundButtons.length).toEqual(3);
                foundButtons.forEach((button, idx) => {
                    expect(button.getAttribute('title')).toBe(idx > 0 ? 'Tooltip for disabled' : 'Tooltip for enabled');
                });
            });
            it('readonly - off', () => {
                setProps({
                    addRowButton: { label: 'Add', onClick: onAddClick },
                    onDeleteRow: onDeleteClick,
                    readonly: true
                });
                expect(container.querySelectorAll(selectors.deleteButton).length).toEqual(0);
            });
            it('disabled', () => {
                setProps({
                    addRowButton: { label: 'Add', onClick: onAddClick },
                    onDeleteRow: onDeleteClick,
                    onRenderDeleteAction: ({ rowIndex }) => {
                        return {
                            isDeleteDisabled: rowIndex > 0
                        };
                    }
                });
                const foundButtons = container.querySelectorAll(selectors.deleteButton);
                expect(foundButtons.length).toEqual(3);
                foundButtons.forEach((button, idx) => {
                    expect((button as HTMLButtonElement).disabled).toBe(idx > 0 ? true : false);
                });
            });
        });

        describe('reorder buttons', () => {
            it('render', () => {
                setProps({
                    onTableReorder: () => {
                        return;
                    }
                });
                const upButtonsFound = container.querySelectorAll(selectors.upArrow);
                const downButtonsFound = container.querySelectorAll(selectors.downArrow);
                expect(upButtonsFound.length).toBe(3);
                expect(downButtonsFound.length).toBe(3);
                upButtonsFound.forEach((button, idx) => {
                    expect(button.className.includes('is-disabled') === (idx === 0)).toBeTruthy();
                });
                downButtonsFound.forEach((button, idx) => {
                    expect(button.className.includes('is-disabled') === (idx === 2)).toBeTruthy();
                });
                expect((container.querySelector(selectors.content) as HTMLElement).style.cursor).toBe('grab');
            });
            it('move up/down not rendered', () => {
                setProps({ onTableReorder: undefined });
                const upButtonsFound = container.querySelectorAll(selectors.upArrow);
                const downButtonsFound = container.querySelectorAll(selectors.downArrow);
                expect(upButtonsFound.length).toBe(0);
                expect(downButtonsFound.length).toBe(0);
                expect((container.querySelector(selectors.content) as HTMLElement).style.cursor).toBe('default');
            });

            it('move up/down disabled for new line item index 1(2nd row) with tooltip', () => {
                setProps({
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
                const upButtonsFound = container.querySelectorAll(selectors.upArrow);
                const downButtonsFound = container.querySelectorAll(selectors.downArrow);
                expect(upButtonsFound.length).toBe(3);
                expect(downButtonsFound.length).toBe(3);
                upButtonsFound.forEach((button, idx) => {
                    expect(button.className.includes('is-disabled') === [0, 1].includes(idx)).toBeTruthy();
                    expect(button.getAttribute('title')).toBe(idx === 1 ? 'Testing move up disabled' : '');
                });
                downButtonsFound.forEach((button, idx) => {
                    expect(button.className.includes('is-disabled') === [1, 2].includes(idx)).toBeTruthy();
                    expect(button.getAttribute('title')).toBe(idx === 1 ? 'Testing move down disabled' : '');
                });
            });
            it('readonly - off', () => {
                setProps({
                    onTableReorder: () => {
                        return;
                    },
                    readonly: true
                });
                const upButtonsFound = container.querySelectorAll(selectors.upArrow);
                const downButtonsFound = container.querySelectorAll(selectors.downArrow);
                expect(upButtonsFound.length).toBe(0);
                expect(downButtonsFound.length).toBe(0);
            });
            it('no handler - off', () => {
                setProps({ onTableReorder: undefined });
                const upButtonsFound = container.querySelectorAll(selectors.upArrow);
                const downButtonsFound = container.querySelectorAll(selectors.downArrow);
                expect(upButtonsFound.length).toBe(0);
                expect(downButtonsFound.length).toBe(0);
            });

            it('click down button', async () => {
                const onReorder = jest.fn();
                setProps({ onTableReorder: onReorder });

                const downButtonsFound = container.querySelectorAll(selectors.downArrow);
                const button = downButtonsFound[0] as HTMLButtonElement;
                fireEvent.focus(button);

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

                fireEvent.click(button);
                setProps({ isContentLoading: true });
                await act(async () => {
                    await delay(200);
                });
                setProps({ isContentLoading: false });
                getByIdSpy.mockRestore();

                expect(onReorder.mock.calls.length).toBe(1);
                expect(onReorder.mock.calls[0][0]).toStrictEqual({ oldIndex: 0, newIndex: 1 });
                expect(focusSpy).toHaveBeenCalledTimes(2);
                expect(idMismatches).toBe(0);
                // Focus should not be reseted anymore
                focusSpy.mockReset();
                const root = container.querySelector(selectors.tableRoot) as HTMLElement;
                fireEvent.blur(root);
                setProps({ isContentLoading: true });
                await act(async () => {
                    await delay(200);
                });
                setProps({ isContentLoading: false });
                expect(focusSpy).toHaveBeenCalledTimes(0);
            });

            it('click last available down button', async () => {
                const onReorder = jest.fn();
                setProps({ onTableReorder: onReorder });

                const downButtonsFound = container.querySelectorAll(selectors.downArrow);
                const button = downButtonsFound[0] as HTMLButtonElement;
                fireEvent.focus(button);

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

                fireEvent.click(button);
                setProps({ isContentLoading: true });
                await act(async () => {
                    await delay(200);
                });
                setProps({ isContentLoading: false });
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
                setProps({ onTableReorder: onReorder });

                const upButtonsFound = container.querySelectorAll(selectors.upArrow);
                const button = upButtonsFound[upButtonsFound.length - 1] as HTMLButtonElement;
                fireEvent.focus(button);

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

                fireEvent.click(button);
                setProps({ isContentLoading: true });
                await act(async () => {
                    await delay(200);
                });
                setProps({ isContentLoading: false });
                getByIdSpy.mockRestore();

                expect(onReorder.mock.calls.length).toBe(1);
                expect(onReorder.mock.calls[0][0]).toStrictEqual({ oldIndex: 2, newIndex: 1 });
                expect(focusSpy).toHaveBeenCalled();
                expect(idMismatches).toBe(0);
            });

            it('click last available up button', async () => {
                const onReorder = jest.fn();
                setProps({ onTableReorder: onReorder });

                const upButtonsFound = container.querySelectorAll(selectors.upArrow);
                const button = upButtonsFound[upButtonsFound.length - 1] as HTMLButtonElement;
                fireEvent.focus(button);

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

                fireEvent.click(button);
                setProps({ isContentLoading: true });
                await act(async () => {
                    await delay(200);
                });
                setProps({ isContentLoading: false });
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
        let props: UIFlexibleTableProps<number>;
        let container: HTMLElement;
        let rerender: (ui: React.ReactElement) => void;

        beforeEach(() => {
            props = {
                layout: UIFlexibleTableLayout.Wrapping,
                id: tableId,
                columns,
                rows,
                onRenderCell,
                onTableReorder: () => {
                    return;
                },
                showColumnTitles: true
            };
            ({ container, rerender } = render(<UIFlexibleTable {...props} />));
        });

        afterEach(() => {
            jest.clearAllMocks();
        });

        const setProps = (newProps: Partial<UIFlexibleTableProps<number>>) => {
            props = { ...props, ...newProps };
            rerender(<UIFlexibleTable {...props} />);
        };

        it('Render default', () => {
            expect(container.querySelector(selectors.tableRoot)).toBeTruthy();
            expect(container.querySelectorAll(selectors.tableWrappingLayout).length).toEqual(1);
            expect(container.querySelectorAll(selectors.content).length).toEqual(1);
            expect(container.querySelectorAll(selectors.addButton).length).toEqual(0);
            const rowObjects = container.querySelectorAll(selectors.row);
            expect(rowObjects.length).toEqual(3);
            const rowHeaderObjects = container.querySelectorAll(selectors.rowHeader);
            expect(rowHeaderObjects.length).toEqual(3);
            expect(container.querySelectorAll(selectors.titleRow).length).toEqual(0);

            // check content
            rowObjects.forEach((row, rowIndex) => {
                columns.forEach((col) => {
                    // check row title
                    const rowTitle = row.querySelector(selectors.rowTitleContainer);
                    expect(rowTitle?.textContent).toBe(rows[rowIndex].title);

                    // check row default actions
                    const rowActions = row.querySelector(selectors.rowHeaderActionsContainer);
                    expect(rowActions).toBeTruthy();
                    // up and down action buttons should be present
                    const upBtn = rowActions?.querySelector(selectors.upArrow);
                    const downBtn = rowActions?.querySelector(selectors.downArrow);
                    expect(upBtn).toBeTruthy();
                    expect(downBtn).toBeTruthy();

                    // check data cells
                    const selector = `.cell-value-${rows[rowIndex].key}-${col.key} ${selectors.cellValueMain}`;
                    const dataCellsFound = row.querySelectorAll(selector);
                    expect(dataCellsFound.length).toBe(col.hidden ? 0 : 1);
                    if (!col.hidden) {
                        expect(dataCellsFound[0].textContent).toBe(String(rows[rowIndex].cells[col.key]));
                    }
                });
            });
        });

        it('Render delete actions on header', () => {
            setProps({
                onDeleteRow: () => null,
                onRenderDeleteAction: (params) => ({ isDeleteDisabled: params.rowIndex === 1 })
            });
            const rowObjects = container.querySelectorAll(selectors.row);
            rowObjects.forEach((row, rowIndex) => {
                const action = row.querySelector(
                    `${selectors.rowHeaderActionsContainer} ${selectors.rowActionWrapper} ${selectors.deleteButton}`
                ) as HTMLButtonElement | null;
                expect(action).toBeTruthy();
                expect(!!action?.disabled).toEqual(rowIndex === 1);
            });
        });

        it('Render custom row actions on header', () => {
            setProps({
                onRenderActions: (params) => [
                    <div key="action" className="testAction">
                        {params.rowKey}
                    </div>
                ]
            });
            const rowObjects = container.querySelectorAll(selectors.row);
            rowObjects.forEach((row, rowIndex) => {
                const action = row.querySelector(
                    `${selectors.rowHeaderActionsContainer} ${selectors.rowActionWrapper} .testAction`
                );
                expect(action).toBeTruthy();
                expect(action?.textContent).toBe((rowIndex + 1).toString());
            });
        });

        it('Add button click and scroll to target row after adding', () => {
            const onAddClick = jest.fn().mockImplementation(() => ({ scrollToRow: 1 }));
            Element.prototype.scrollIntoView = jest.fn();
            const scrollSpy = jest.spyOn(Element.prototype, 'scrollIntoView');
            setProps({ addRowButton: { label: 'Add', onClick: onAddClick, ariaLabel: 'Add Button' } });
            expect(container.querySelectorAll(selectors.addButton).length).toEqual(1);
            expect(container.querySelector(selectors.addButton)?.getAttribute('aria-label')).toBe('Add Button');
            fireEvent.click(container.querySelector(selectors.addButton)!);
            expect(onAddClick.mock.calls.length).toEqual(1);
            setProps({ isContentLoading: true });
            setProps({ isContentLoading: false });
            expect(scrollSpy).toHaveBeenCalled();
            expect((scrollSpy.mock.instances[0] as any).parentElement.attributes.getNamedItem('id').value).toBe(
                'row-1'
            );
        });

        it('Disabled reorder row', () => {
            const enabledRowIndex = 0;
            const disablerRowIndex = 1;
            setProps({
                rows: rows.map((row, index) => ({ ...row, disabled: index === disablerRowIndex }))
            });
            // Check enabled row
            const liElements = container.querySelectorAll('li');
            const enabledRow = liElements[enabledRowIndex] as HTMLElement;
            expect(enabledRow.style.cursor).toBe('inherit');
            expect(enabledRow.style.touchAction).toBe('none');
            expect(enabledRow.style.userSelect).toBe('none');
            expect(enabledRow.style.pointerEvents).toBe('all');
            // Check disabled row
            const disabledRow = liElements[disablerRowIndex] as HTMLElement;
            expect(disabledRow.style.cursor).toBe('default');
            expect(disabledRow.style.touchAction).toBe('auto');
            expect(disabledRow.style.userSelect).toBe('none');
            expect(disabledRow.style.pointerEvents).toBe('all');
        });

        describe('Test property "isTouchDragDisabled"', () => {
            const testCases = [
                {
                    isTouchDragDisabled: true,
                    stopImmediatePropagation: true
                },
                {
                    isTouchDragDisabled: false,
                    stopImmediatePropagation: false
                },
                {
                    isTouchDragDisabled: true,
                    dragDisabled: true,
                    stopImmediatePropagation: false
                }
            ];
            for (const testCase of testCases) {
                const { isTouchDragDisabled, stopImmediatePropagation, dragDisabled } = testCase;
                it(`isTouchDragDisabled=${isTouchDragDisabled}; dragDisabled=${dragDisabled}`, () => {
                    const rowIndex = 0;
                    setProps({
                        isTouchDragDisabled,
                        rows: rows.map((row, index) => ({ ...row, disabled: !!dragDisabled && index === 0 }))
                    });
                    // Check styles
                    const liElements = container.querySelectorAll('li');
                    const row = liElements[rowIndex] as HTMLElement;
                    expect(row.style.touchAction).toBe(isTouchDragDisabled ? 'auto' : 'none');
                    expect(row.style.pointerEvents).toBe('all');

                    // Check touch event handling
                    const stopImmediatePropagationMockStart = jest.fn();
                    const stopImmediatePropagationMockEnd = jest.fn();
                    fireEvent.touchStart(row, {
                        nativeEvent: { stopImmediatePropagation: stopImmediatePropagationMockStart }
                    });
                    fireEvent.touchEnd(row, {
                        nativeEvent: { stopImmediatePropagationMockEnd }
                    });
                    // The actual handler calls event.nativeEvent.stopImmediatePropagation
                    // fireEvent does not replicate nativeEvent, so we verify via the DOM handler registration
                    // by checking the number of calls on the real nativeEvent mock via low-level dispatch
                    const touchStartStopSpy = jest.fn();
                    const touchEndStopSpy = jest.fn();
                    const createTouchEventWithSpy = (spy: jest.Mock) => {
                        const event = new TouchEvent('touchstart', { bubbles: true, cancelable: true });
                        Object.defineProperty(event, 'stopImmediatePropagation', { value: spy });
                        return event;
                    };
                    const touchStartEvent = new TouchEvent('touchstart', { bubbles: true, cancelable: true });
                    Object.defineProperty(touchStartEvent, 'stopImmediatePropagation', {
                        value: touchStartStopSpy
                    });
                    row.dispatchEvent(touchStartEvent);
                    expect(touchStartStopSpy).toHaveBeenCalledTimes(stopImmediatePropagation ? 1 : 0);

                    const touchEndEvent = new TouchEvent('touchend', { bubbles: true, cancelable: true });
                    Object.defineProperty(touchEndEvent, 'stopImmediatePropagation', {
                        value: touchEndStopSpy
                    });
                    row.dispatchEvent(touchEndEvent);
                    expect(touchEndStopSpy).toHaveBeenCalledTimes(stopImmediatePropagation ? 1 : 0);
                });
            }
        });
    });

    describe('InlineFlex layout', () => {
        let props: UIFlexibleTableProps<number>;
        let container: HTMLElement;
        let rerender: (ui: React.ReactElement) => void;

        beforeEach(() => {
            props = {
                layout: UIFlexibleTableLayout.InlineFlex,
                id: tableId,
                columns,
                rows: [],
                onRenderCell,
                onTableReorder: () => {
                    return;
                }
            };
            ({ container, rerender } = render(<UIFlexibleTable {...props} />));
        });

        const setProps = (newProps: Partial<UIFlexibleTableProps<number>>) => {
            props = { ...props, ...newProps };
            rerender(<UIFlexibleTable {...props} />);
        };

        it('"noDataText" as string', () => {
            const noDataText = 'dummy no data';
            setProps({ noDataText });
            const noData = container.querySelector(selectors.noData);
            expect(container.querySelectorAll(selectors.noData).length).toEqual(1);
            expect(noData?.textContent).toEqual(noDataText);
        });

        it('"noDataText" as element', () => {
            setProps({ noDataText: <div className="customNoData"></div> });
            const noData = container.querySelector('.customNoData');
            expect(noData).toBeTruthy();
        });

        it('"noRowBackground"', () => {
            const noDataText = 'dummy no data';
            setProps({ noRowBackground: true, noDataText });
            expect(container.querySelectorAll(`${selectors.noData}.no-background`).length).toEqual(1);
        });

        it('"reverseBackground" ', () => {
            const noDataText = 'dummy no data';
            setProps({ reverseBackground: true, noDataText });
            expect(container.querySelectorAll(`${selectors.noData}.reverse-background`).length).toEqual(1);
        });
    });
});
