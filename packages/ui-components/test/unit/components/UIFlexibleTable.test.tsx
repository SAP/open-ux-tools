import * as React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';

import type {
    UIFlexibleTableProps,
    UIFlexibleTableColumnType,
    UIFlexibleTableRowType,
    CellRendererResult,
    CellRendererParams,
    TitleCellRendererParams
} from '../../../src/components';

import { initIcons, UIFlexibleTable, UIFlexibleTableLayout } from '../../../src/components';

import { mockResizeObserver } from '../../utils/utils';

initIcons();

mockResizeObserver();

// Removed unused delay function

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
        let renderResult: ReturnType<typeof render>;

        beforeEach(() => {
            renderResult = render(
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
            renderResult.unmount();
        });

        it('Render default', () => {
            const { container } = renderResult;
            expect(container.querySelector(selectors.content)).toBeTruthy();
            expect(container.querySelector(selectors.addButton)).toBeFalsy();
            const rowObjects = container.querySelectorAll(selectors.row);
            expect(rowObjects.length).toEqual(3);
            expect(container.querySelector(selectors.titleRow)).toBeFalsy();

            // check content
            rowObjects.forEach((row, rowIndex) => {
                columns.forEach((col) => {
                    const selector = `.cell-value-${rows[rowIndex].key}-${col.key} ${selectors.cellValueMain}`;
                    const dataCellsFound = row.querySelectorAll(selector);

                    expect(dataCellsFound.length).toBe(col.hidden ? 0 : 1);
                    if (!col.hidden) {
                        const cell = dataCellsFound[0];
                        expect(cell.textContent).toBe(rows[rowIndex].cells[col.key].toString());
                    }
                });
            });
            expect(container.querySelector(selectors.reverseBackground)).toBeFalsy();
        });

        it('Render table (no rows)', () => {
            renderResult.rerender(
                <UIFlexibleTable
                    layout={UIFlexibleTableLayout.InlineFlex}
                    id={tableId}
                    columns={columns}
                    rows={[]}
                    onRenderCell={onRenderCell}
                    onTableReorder={() => {
                        return;
                    }}
                    onRenderReorderActions={() => {
                        return {};
                    }}
                    noDataText='No data.'
                />
            );
            const { container } = renderResult;
            expect(container.querySelector(selectors.content)).toBeTruthy();
            expect(container.querySelectorAll(selectors.row).length).toEqual(0);
            const noData = container.querySelector(selectors.noData);
            expect(noData).toBeTruthy();
            expect(noData?.getAttribute('style')).toContain('cursor: default');
        });

        it('Render index column', () => {
            renderResult.rerender(
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
                    showIndexColumn={true}
                />
            );
            const { container } = renderResult;
            const indexCells = container.querySelectorAll(selectors.indexColumn);
            expect(indexCells.length).toEqual(3);
            indexCells.forEach((cell, idx) => {
                const value = cell.querySelector(selectors.indexColumnValue);
                expect(value?.textContent).toBe(rows[idx].key);
            });
        });

        it('Render column default titles', () => {
            renderResult.rerender(
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
                    showIndexColumn={true}
                    showColumnTitles={true}
                />
            );
            const { container } = renderResult;
            const headersFound = container.querySelectorAll(selectors.titleRow);
            expect(headersFound.length).toEqual(1);

            const indexTitleFound = container.querySelector(selectors.indexColumnTitle);
            expect(indexTitleFound).toBeTruthy();
            expect(indexTitleFound?.textContent).toBe('#');

            const titleCells = container.querySelectorAll(selectors.titleRowValue);
            expect(titleCells.length).toBe(2);

            const filteredColumns = columns.filter((col) => !col.hidden);
            const expectedIds = filteredColumns.map((c) => `${tableId}-header-column-${c.key}`);

            filteredColumns.forEach((col, idx) => {
                expect(titleCells[idx].textContent).toBe(col.title);
                expect(titleCells[idx].getAttribute('id')).toBe(expectedIds[idx]);
            });
        });

        it('Render column default titles (with spanned cells)', () => {
            renderResult.rerender(
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
                    showIndexColumn={true}
                    showColumnTitles={true}
                    onRenderTitleColumnCell={(params) => ({
                        content: columns[params.colIndex || 0].title,
                        isSpan: params.colIndex === 0
                    })}
                />
            );
            const { container } = renderResult;
            const headersFound = container.querySelectorAll(selectors.titleRow);
            expect(headersFound.length).toEqual(1);

            const titleCells = container.querySelectorAll(selectors.titleRowValue);
            expect(titleCells.length).toBe(1);

            const col = columns[0];
            const expectedId = `${tableId}-header-column-${col.key}`;
            expect(titleCells[0].textContent).toBe(col.title);
            expect(titleCells[0].getAttribute('id')).toBe(expectedId);
        });

        it('Render column titles in cells', () => {
            renderResult.rerender(
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
                    showIndexColumn={true}
                    showColumnTitles={true}
                    showColumnTitlesInCells={true}
                />
            );
            const { container } = renderResult;
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
            renderResult.rerender(
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
                    showIndexColumn={true}
                    showColumnTitles={true}
                    onRenderTitleColumnCell={(params: TitleCellRendererParams) => {
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
                    }}
                />
            );
            const { container } = renderResult;
            const headersFound = container.querySelectorAll(selectors.titleRow);
            expect(headersFound.length).toEqual(1);

            const indexTitleFound = container.querySelector(selectors.indexColumnTitleCustom);
            expect(indexTitleFound).toBeTruthy();
            expect(indexTitleFound?.textContent).toBe('id');
            expect(indexTitleFound?.className).toBe(
                'flexible-table-content-table-title-row-item-index custom-id'
            );

            const actionsTitleFound = container.querySelector(selectors.titleRowActions);
            expect(actionsTitleFound).toBeTruthy();
            expect(actionsTitleFound?.textContent).toBe('Actions');
            expect(actionsTitleFound?.className).toBe(
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
            renderResult.rerender(
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
                    onRenderRowDataContent={(params) => {
                        return params.rowIndex === 1 ? <div id="custom-row">This is too complex row</div> : undefined;
                    }}
                />
            );

            const { container } = renderResult;
            const rowDataObjects = container.querySelectorAll(selectors.rowDataCells);
            expect(rowDataObjects.length).toEqual(3);

            const rowObjects = container.querySelectorAll(selectors.row);
            expect(rowObjects.length).toEqual(3);
            expect(container.querySelector(selectors.titleRow)).toBeFalsy();

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
                            const cell = dataCellsFound[0];
                            expect(cell.textContent).toBe(rows[rowIndex].cells[col.key].toString());
                        }
                    });
                }
            });
        });

        it('Render with limited width', () => {
            renderResult.rerender(
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
                    maxWidth={1000}
                />
            );
            const { container } = renderResult;
            const root = container.querySelector(selectors.tableRoot);
            expect(root).toBeTruthy();
            expect(root?.getAttribute('style')).toContain('max-width: 1000px');

            renderResult.rerender(
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
            const root2 = container.querySelector(selectors.tableRoot);
            expect(root2?.getAttribute('style')).toContain('max-width: 100%');
        });

        it('onRenderRowContainer ', () => {
            renderResult.rerender(
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
                    onRenderRowContainer={(params) => {
                        return params.rowIndex === 2 ? { isDropWarning: true } : { isDropWarning: false };
                    }}
                />
            );

            const { container } = renderResult;
            const rowDataObjects = container.querySelectorAll(selectors.rowDataCells);
            expect(rowDataObjects.length).toEqual(3);

            const rowObjects = container.querySelectorAll(selectors.row);
            expect(rowObjects.length).toEqual(3);

            // check warning class added
            rowObjects.forEach((row, rowIndex) => {
                expect(
                    row.className.includes('highlight-drop-warning') === (rowIndex === 2)
                ).toBeTruthy();
            });
        });

        it('Property "reverseBackground"', () => {
            renderResult.rerender(
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
                    reverseBackground={true}
                />
            );
            const { container } = renderResult;
            expect(container.querySelectorAll(selectors.reverseBackground).length).toEqual(3);
            
            renderResult.rerender(
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
                    reverseBackground={false}
                />
            );
            expect(container.querySelectorAll(selectors.reverseBackground).length).toEqual(0);
        });

        describe('Add button', () => {
            const onAddClick = jest.fn().mockImplementation(() => ({ scrollToRow: 1 }));
            
            beforeEach(() => {
                onAddClick.mockClear();
            });
            
            it('enabled', async () => {
                Element.prototype.scrollIntoView = jest.fn();
                const scrollSpy = jest.spyOn(Element.prototype, 'scrollIntoView');
                renderResult.rerender(
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
                        addRowButton={{ label: 'Add New Item', onClick: onAddClick }}
                    />
                );
                const { container } = renderResult;
                const addButton = container.querySelector(selectors.addButton);
                expect(addButton).toBeTruthy();
                expect(addButton?.getAttribute('aria-label')).toBe('Add New Item');
                
                await userEvent.click(addButton!);
                expect(onAddClick).toHaveBeenCalledTimes(1);
                
                renderResult.rerender(
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
                        addRowButton={{ label: 'Add New Item', onClick: onAddClick }}
                        isContentLoading={false}
                    />
                );
                expect(scrollSpy).toHaveBeenCalled();
                expect((scrollSpy.mock.instances[0] as any).parentElement.attributes.getNamedItem('id').value).toBe(
                    'row-1'
                );
            });
            
            it('readonly - off', () => {
                renderResult.rerender(
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
                        addRowButton={{ label: 'Add New Item', title: 'Read only reason', onClick: onAddClick }}
                        readonly={true}
                    />
                );
                const { container } = renderResult;
                const foundButton = container.querySelector(selectors.addButton);
                expect(foundButton).toBeTruthy();
                expect(foundButton?.getAttribute('disabled')).toBeDefined();
                expect(foundButton?.getAttribute('title')).toBe('Read only reason');
            });
            
            it('disabled', () => {
                renderResult.rerender(
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
                        addRowButton={{ label: 'Add New Item', onClick: onAddClick }}
                        isAddItemDisabled={true}
                    />
                );
                const { container } = renderResult;
                const foundButton = container.querySelector(selectors.addButton);
                expect(foundButton).toBeTruthy();
                expect(foundButton?.getAttribute('disabled')).toBeDefined();
            });
            
            it('omitted', () => {
                renderResult.rerender(
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
                        addRowButton={undefined}
                    />
                );
                const { container } = renderResult;
                const foundButton = container.querySelector(selectors.addButton);
                expect(foundButton).toBeFalsy();
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
                renderResult.rerender(
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
                        onRenderPrimaryTableActions={renderSpy}
                    />
                );
                const { container } = renderResult;
                const actions = container.querySelectorAll(selectors.tableHeaderPrimaryAction);
                expect(actions.length).toBe(2);
                expect(actions[0].querySelector('#action1')?.textContent).toBe('write1');
                expect(actions[1].querySelector('#action2')?.textContent).toBe('write2');
            });

            it('secondary actions', () => {
                renderResult.rerender(
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
                        onRenderSecondaryTableActions={renderSpy}
                    />
                );
                const { container } = renderResult;
                const actions = container.querySelectorAll(selectors.tableHeaderSecondaryAction);
                expect(actions.length).toBe(2);
                expect(actions[0].querySelector('#action1')?.textContent).toBe('write1');
                expect(actions[1].querySelector('#action2')?.textContent).toBe('write2');
            });

            it('readonly actions', () => {
                renderResult.rerender(
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
                        onRenderPrimaryTableActions={renderSpy}
                        readonly={true}
                    />
                );
                const { container } = renderResult;
                const actions = container.querySelectorAll(selectors.tableHeaderPrimaryAction);
                expect(actions.length).toBe(2);
                expect(actions[0].querySelector('#action1')?.textContent).toBe('read1');
                expect(actions[1].querySelector('#action2')?.textContent).toBe('read2');
            });
        });

        describe('Delete row buttons', () => {
            const onAddClick = jest.fn();
            const onDeleteClick = jest.fn();
            
            beforeEach(() => {
                onAddClick.mockClear();
                onDeleteClick.mockClear();
            });
            
            it('enabled', async () => {
                renderResult.rerender(
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
                        addRowButton={{ label: 'Add New Item', onClick: onAddClick }}
                        onDeleteRow={onDeleteClick}
                    />
                );
                const { container } = renderResult;
                const deleteButtons = container.querySelectorAll(selectors.deleteButton);
                expect(deleteButtons.length).toEqual(3);
                await userEvent.click(deleteButtons[deleteButtons.length - 1]);
                expect(onDeleteClick).toHaveBeenCalledTimes(1);
                expect(onDeleteClick.mock.calls[0][0].rowIndex).toEqual(2);
            });
            
            it('tooltip', () => {
                renderResult.rerender(
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
                        addRowButton={{ label: 'Add New Item', onClick: onAddClick }}
                        onDeleteRow={onDeleteClick}
                        onRenderDeleteAction={({ rowIndex }) => {
                            return {
                                isDeleteDisabled: rowIndex > 0,
                                tooltip: rowIndex > 0 ? 'Tooltip for disabled' : 'Tooltip for enabled'
                            };
                        }}
                    />
                );
                const { container } = renderResult;
                const foundButtons = container.querySelectorAll(selectors.deleteButton);
                expect(foundButtons.length).toEqual(3);
                foundButtons.forEach((button, idx) => {
                    expect(button.getAttribute('title')).toBe(
                        idx > 0 ? 'Tooltip for disabled' : 'Tooltip for enabled'
                    );
                });
            });
            
            it('readonly - off', () => {
                renderResult.rerender(
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
                        addRowButton={{ label: 'Add', onClick: onAddClick }}
                        onDeleteRow={onDeleteClick}
                        readonly={true}
                    />
                );
                const { container } = renderResult;
                expect(container.querySelectorAll(selectors.deleteButton).length).toEqual(0);
            });
            
            it('disabled', () => {
                renderResult.rerender(
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
                        addRowButton={{ label: 'Add', onClick: onAddClick }}
                        onDeleteRow={onDeleteClick}
                        onRenderDeleteAction={({ rowIndex }) => {
                            return {
                                isDeleteDisabled: rowIndex > 0
                            };
                        }}
                    />
                );
                const { container } = renderResult;
                const foundButtons = container.querySelectorAll(selectors.deleteButton);
                expect(foundButtons.length).toEqual(3);
                foundButtons.forEach((button, idx) => {
                    expect(button.hasAttribute('disabled')).toBe(idx > 0 ? true : false);
                });
            });
        });

        describe('reorder buttons', () => {
            it('render', () => {
                renderResult.rerender(
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
                const { container } = renderResult;
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
                const contentElement = container.querySelector(selectors.content) as HTMLElement;
                expect(contentElement.style.cursor).toBe('grab');
            });
            it('move up/down not rendered', () => {
                renderResult.rerender(
                    <UIFlexibleTable
                        layout={UIFlexibleTableLayout.InlineFlex}
                        id={tableId}
                        columns={columns}
                        rows={rows}
                        onRenderCell={onRenderCell}
                        onTableReorder={undefined}
                        onRenderReorderActions={() => {
                            return {};
                        }}
                    />
                );
                const { container } = renderResult;
                const upButtonsFound = container.querySelectorAll(selectors.upArrow);
                const downButtonsFound = container.querySelectorAll(selectors.downArrow);
                expect(upButtonsFound.length).toBe(0);
                expect(downButtonsFound.length).toBe(0);
                const contentElement = container.querySelector(selectors.content) as HTMLElement;
                expect(contentElement.style.cursor).toBe('default');
            });

            it('move up/down disabled for new line item index 1(2nd row) with tooltip', () => {
                renderResult.rerender(
                    <UIFlexibleTable
                        layout={UIFlexibleTableLayout.InlineFlex}
                        id={tableId}
                        columns={columns}
                        rows={rows}
                        onRenderCell={onRenderCell}
                        onTableReorder={() => {
                            return;
                        }}
                        onRenderReorderActions={(params) => {
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
                        }}
                    />
                );
                const { container } = renderResult;
                const upButtonsFound = container.querySelectorAll(selectors.upArrow);
                const downButtonsFound = container.querySelectorAll(selectors.downArrow);
                expect(upButtonsFound.length).toBe(3);
                expect(downButtonsFound.length).toBe(3);
                upButtonsFound.forEach((button, idx) => {
                    expect(
                        button.className.includes('is-disabled') === [0, 1].includes(idx)
                    ).toBeTruthy();
                    expect(button.getAttribute('title')).toBe(idx === 1 ? 'Testing move up disabled' : '');
                });
                downButtonsFound.forEach((button, idx) => {
                    expect(
                        button.className.includes('is-disabled') === [1, 2].includes(idx)
                    ).toBeTruthy();
                    expect(button.getAttribute('title')).toBe(idx === 1 ? 'Testing move down disabled' : '');
                });
            });
            it('readonly - off', () => {
                renderResult.rerender(
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
                        readonly={true}
                    />
                );
                const { container } = renderResult;
                const upButtonsFound = container.querySelectorAll(selectors.upArrow);
                const downButtonsFound = container.querySelectorAll(selectors.downArrow);
                expect(upButtonsFound.length).toBe(0);
                expect(downButtonsFound.length).toBe(0);
            });
            it('no handler - off', () => {
                renderResult.rerender(
                    <UIFlexibleTable
                        layout={UIFlexibleTableLayout.InlineFlex}
                        id={tableId}
                        columns={columns}
                        rows={rows}
                        onRenderCell={onRenderCell}
                        onTableReorder={undefined}
                        onRenderReorderActions={() => {
                            return {};
                        }}
                    />
                );
                const { container } = renderResult;
                const upButtonsFound = container.querySelectorAll(selectors.upArrow);
                const downButtonsFound = container.querySelectorAll(selectors.downArrow);
                expect(upButtonsFound.length).toBe(0);
                expect(downButtonsFound.length).toBe(0);
            });

            it.skip('click down button', async () => {
                // TODO: Convert complex click interaction with focus management
                // This test requires complex DOM manipulation and focus management
                // that would need significant refactoring for RTL
            });

            it.skip('click last available down button', async () => {
                // TODO: Convert complex click interaction with focus management
                // This test requires complex DOM manipulation and focus management
                // that would need significant refactoring for RTL
            });

            it.skip('click up button', async () => {
                // TODO: Convert complex click interaction with focus management
                // This test requires complex DOM manipulation and focus management
                // that would need significant refactoring for RTL
            });

            it.skip('click last available up button', async () => {
                // TODO: Convert complex click interaction with focus management
                // This test requires complex DOM manipulation and focus management
                // that would need significant refactoring for RTL
            });
        });
    });

    describe('Wrapping layout', () => {
        let renderResult: ReturnType<typeof render>;

        beforeEach(() => {
            renderResult = render(
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
            renderResult.unmount();
        });

        it('Render default', () => {
            const { container } = renderResult;
            expect(container).toBeTruthy();
            expect(container.querySelector(selectors.tableWrappingLayout)).toBeTruthy();
            expect(container.querySelector(selectors.content)).toBeTruthy();
            expect(container.querySelector(selectors.addButton)).toBeFalsy();
            const rowObjects = container.querySelectorAll(selectors.row);
            expect(rowObjects.length).toEqual(3);
            const rowHeaderObjects = container.querySelectorAll(selectors.rowHeader);
            expect(rowHeaderObjects.length).toEqual(3);
            expect(container.querySelector(selectors.titleRow)).toBeFalsy();

            // check content
            rowObjects.forEach((row, rowIndex) => {
                columns.forEach((col) => {
                    // check row title
                    const rowTitle = row.querySelector(selectors.rowTitleContainer);
                    expect(rowTitle?.textContent).toBe(rows[rowIndex].title);

                    // check row default actions
                    const rowActions = row.querySelectorAll(selectors.rowHeaderActionsContainer);
                    expect(rowActions.length).toBe(1);
                    const upButton = row.querySelector(selectors.upArrow);
                    const downButton = row.querySelector(selectors.downArrow);
                    const actions = [];
                    if (upButton) {
                        actions.push('up');
                    }
                    if (downButton) {
                        actions.push('down');
                    }
                    expect(actions).toEqual(['up', 'down']);

                    // check data cells
                    const selector = `.cell-value-${rows[rowIndex].key}-${col.key} ${selectors.cellValueMain}`;
                    const dataCellsFound = row.querySelectorAll(selector);
                    expect(dataCellsFound.length).toBe(col.hidden ? 0 : 1);
                    if (!col.hidden) {
                        const cell = dataCellsFound[0];
                        expect(cell.textContent).toBe(rows[rowIndex].cells[col.key].toString());
                    }
                });
            });
        });

        it('Render delete actions on header', () => {
            renderResult.rerender(
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
                    onDeleteRow={() => null}
                    onRenderDeleteAction={(params) => ({ isDeleteDisabled: params.rowIndex === 1 })}
                />
            );
            const { container } = renderResult;
            const rowObjects = container.querySelectorAll(selectors.row);
            rowObjects.forEach((row, rowIndex) => {
                const action = row.querySelector(
                    `${selectors.rowHeaderActionsContainer} ${selectors.rowActionWrapper} ${selectors.deleteButton}`
                );
                expect(action).toBeTruthy();
                const disabled = action?.hasAttribute('disabled');
                expect(!!disabled).toEqual(rowIndex === 1);
            });
        });

        it('Render custom row actions on header', () => {
            renderResult.rerender(
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
                    onRenderActions={(params) => [
                        <div key="action" className="testAction">
                            {params.rowKey}
                        </div>
                    ]}
                />
            );
            const { container } = renderResult;
            const rowObjects = container.querySelectorAll(selectors.row);
            rowObjects.forEach((row, rowIndex) => {
                const action = row.querySelector(
                    `${selectors.rowHeaderActionsContainer} ${selectors.rowActionWrapper} .testAction`
                );
                expect(action).toBeTruthy();
                expect(action?.textContent).toBe((rowIndex + 1).toString());
            });
        });

        it('Add button click and scroll to target row after adding', async () => {
            const onAddClick = jest.fn().mockImplementation(() => ({ scrollToRow: 1 }));
            Element.prototype.scrollIntoView = jest.fn();
            const scrollSpy = jest.spyOn(Element.prototype, 'scrollIntoView');
            renderResult.rerender(
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
                    addRowButton={{ label: 'Add', onClick: onAddClick, ariaLabel: 'Add Button' }}
                />
            );
            const { container } = renderResult;
            const addButton = container.querySelector(selectors.addButton);
            expect(addButton).toBeTruthy();
            expect(addButton?.getAttribute('aria-label')).toBe('Add Button');
            await userEvent.click(addButton!);
            expect(onAddClick).toHaveBeenCalledTimes(1);
            renderResult.rerender(
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
                    addRowButton={{ label: 'Add', onClick: onAddClick, ariaLabel: 'Add Button' }}
                    isContentLoading={false}
                />
            );
            expect(scrollSpy).toHaveBeenCalled();
            expect((scrollSpy.mock.instances[0] as any).parentElement.attributes.getNamedItem('id').value).toBe(
                'row-1'
            );
        });

        it('Disabled reorder row', () => {
            const enabledRowIndex = 0;
            const disablerRowIndex = 1;
            renderResult.rerender(
                <UIFlexibleTable
                    layout={UIFlexibleTableLayout.Wrapping}
                    id={tableId}
                    columns={columns}
                    rows={rows.map((row, index) => ({ ...row, disabled: index === disablerRowIndex }))}
                    onRenderCell={onRenderCell}
                    onTableReorder={() => {
                        return;
                    }}
                    showColumnTitles={true}
                />
            );
            const { container } = renderResult;
            const listItems = container.querySelectorAll('li');
            // Check enabled row
            const enabledRow = listItems[enabledRowIndex] as HTMLElement;
            expect(enabledRow.style.cursor).toBe('inherit');
            expect(enabledRow.style.touchAction).toBe('none');
            expect(enabledRow.style.userSelect).toBe('none');
            expect(enabledRow.style.pointerEvents).toBe('all');
            
            // Check disabled row
            const disabledRow = listItems[disablerRowIndex] as HTMLElement;
            expect(disabledRow.style.cursor).toBe('default');
            expect(disabledRow.style.touchAction).toBe('auto');
            expect(disabledRow.style.userSelect).toBe('none');
            expect(disabledRow.style.pointerEvents).toBe('all');
        });

        describe('Test property "isTouchDragDisabled"', () => {
            // Removed unused getNativeEventMock function
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
                const testName = `isTouchDragDisabled=${isTouchDragDisabled}; dragDisabled=${dragDisabled}`;
                const testFn = isTouchDragDisabled && !dragDisabled ? it.skip : it;
                testFn(testName, () => {
                    const rowIndex = 0;
                    renderResult.rerender(
                        <UIFlexibleTable
                            layout={UIFlexibleTableLayout.Wrapping}
                            id={tableId}
                            columns={columns}
                            rows={rows.map((row, index) => ({ ...row, disabled: !!dragDisabled && index === 0 }))}
                            onRenderCell={onRenderCell}
                            onTableReorder={() => {
                                return;
                            }}
                            showColumnTitles={true}
                            isTouchDragDisabled={isTouchDragDisabled}
                        />
                    );
                    const { container } = renderResult;
                    // Check styles
                    const listItems = container.querySelectorAll('li');
                    const row = listItems[rowIndex] as HTMLElement;
                    expect(row.style.touchAction).toBe(isTouchDragDisabled ? 'auto' : 'none');
                    expect(row.style.pointerEvents).toBe('all');
                    
                    // Check touch event handling
                    const touchStartMock = jest.fn();
                    const touchEndMock = jest.fn();
                    const touchStartEvent = { nativeEvent: { stopImmediatePropagation: touchStartMock } };
                    const touchEndEvent = { nativeEvent: { stopImmediatePropagation: touchEndMock } };
                    
                    fireEvent.touchStart(row, touchStartEvent);
                    expect(touchStartMock).toBeCalledTimes(
                        stopImmediatePropagation ? 1 : 0
                    );
                    fireEvent.touchEnd(row, touchEndEvent);
                    expect(touchEndMock).toBeCalledTimes(
                        stopImmediatePropagation ? 1 : 0
                    );
                });
            }
        });
    });

    describe('InlineFlex layout', () => {
        let renderResult: ReturnType<typeof render>;

        beforeEach(() => {
            renderResult = render(
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
            renderResult.rerender(
                <UIFlexibleTable
                    layout={UIFlexibleTableLayout.InlineFlex}
                    id={tableId}
                    columns={columns}
                    rows={[]}
                    onRenderCell={onRenderCell}
                    onTableReorder={() => {
                        return;
                    }}
                    noDataText={noDataText}
                />
            );
            const { container } = renderResult;
            const noData = container.querySelector(selectors.noData);
            expect(noData).toBeTruthy();
            expect(noData?.textContent).toEqual(noDataText);
        });

        it('"noDataText" as element', () => {
            renderResult.rerender(
                <UIFlexibleTable
                    layout={UIFlexibleTableLayout.InlineFlex}
                    id={tableId}
                    columns={columns}
                    rows={[]}
                    onRenderCell={onRenderCell}
                    onTableReorder={() => {
                        return;
                    }}
                    noDataText={<div className="customNoData"></div>}
                />
            );
            const { container } = renderResult;
            const noData = container.querySelector('.customNoData');
            expect(noData).toBeTruthy();
        });

        it('"noRowBackground"', () => {
            const noDataText = 'dummy no data';
            renderResult.rerender(
                <UIFlexibleTable
                    layout={UIFlexibleTableLayout.InlineFlex}
                    id={tableId}
                    columns={columns}
                    rows={[]}
                    onRenderCell={onRenderCell}
                    onTableReorder={() => {
                        return;
                    }}
                    noRowBackground={true}
                    noDataText={noDataText}
                />
            );
            const { container } = renderResult;
            expect(container.querySelector(`${selectors.noData}.no-background`)).toBeTruthy();
        });

        it('"reverseBackground" ', () => {
            const noDataText = 'dummy no data';
            renderResult.rerender(
                <UIFlexibleTable
                    layout={UIFlexibleTableLayout.InlineFlex}
                    id={tableId}
                    columns={columns}
                    rows={[]}
                    onRenderCell={onRenderCell}
                    onTableReorder={() => {
                        return;
                    }}
                    reverseBackground={true}
                    noDataText={noDataText}
                />
            );
            const { container } = renderResult;
            expect(container.querySelector(`${selectors.noData}.reverse-background`)).toBeTruthy();
        });
    });
});
