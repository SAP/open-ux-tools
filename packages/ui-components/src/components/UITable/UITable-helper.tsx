import React from 'react';
import type { IDetailsHeaderProps, IRenderFunction, IDetailsListStyles, IDetailsList } from '@fluentui/react';
import { Sticky } from '@fluentui/react';
import { UIIcon } from '..';
import type { ComboBoxRef } from '../UIComboBox';
import type { UIColumn, EditedCell, UITableProps, UITableState } from '.';

/**
 * Method to copy and sort.
 *
 * @param {T[]} items
 * @param {string }columnKey
 * @param {boolean} isSortedDescending
 * @returns {T[]}
 */
export function _copyAndSort<T>(items: T[], columnKey: string, isSortedDescending?: boolean): T[] {
    const key = columnKey as keyof T;
    return items.slice(0).sort((a: T, b: T) => ((isSortedDescending ? a[key] > b[key] : a[key] < b[key]) ? 1 : -1));
}

/**
 * Focus edited cell.
 *
 * @param {EditedCell | undefined} editedCell
 * @param {UITableProps} props
 * @param {string} direction
 * @returns {Promise<void>}
 */
export function focusEditedCell(
    editedCell: EditedCell | undefined,
    props: UITableProps,
    direction = ''
): Promise<void> {
    const rowIndex = editedCell?.rowIndex || 0;
    const colKey = editedCell?.column?.key || '';
    let newRowIndex = rowIndex;
    let newColKey = colKey;

    if (!colKey) {
        return Promise.resolve();
    }
    // go up/down/left/right
    if (direction) {
        const editableColumnKeys = props.columns.filter((c) => c.editable).map((c) => c.key);
        const rowsLen = props.items.length;
        const colIdx = editableColumnKeys.indexOf(colKey);

        if (direction === 'right') {
            if (colIdx < editableColumnKeys.length - 1) {
                newColKey = editableColumnKeys[colIdx + 1];
            }
        } else if (direction === 'left') {
            if (colIdx > 0) {
                newColKey = editableColumnKeys[colIdx - 1];
            }
        } else if (direction === 'down') {
            if (rowIndex < rowsLen - 1) {
                newRowIndex = rowIndex + 1;
            }
        } else if (direction === 'up') {
            if (rowIndex > 0) {
                newRowIndex = rowIndex - 1;
            }
        }
    }

    return new Promise((resolve) => {
        requestAnimationFrame(() => {
            const cell = getCellFromCoords(newRowIndex, newColKey, props.columns, props.showRowNumbers) as HTMLElement;
            if (cell && direction) {
                cell.click();
            }
            cell?.focus();
            requestAnimationFrame(() => resolve());
        });
    });
}

/**
 * Get cell from coordinates.
 *
 * @param {number} rowIdx
 * @param {string} columnKey
 * @param {UIColumn} columns
 * @param {boolean} addOneToColIndex
 * @returns {NodeListOf<Element>}
 */
export function getCellFromCoords(rowIdx: number, columnKey: string, columns: UIColumn[], addOneToColIndex = false) {
    const selectedIdx = (columns.findIndex((col: UIColumn) => col.key === columnKey) || 0) + +addOneToColIndex;
    const row = document.querySelector(
        `.ms-DetailsList .ms-DetailsList-contentWrapper .ms-List-page .ms-DetailsRow[data-item-index="${rowIdx || 0}"]`
    );
    const cols = row?.querySelectorAll('.ms-DetailsRow-cell');
    return cols && cols.length && cols[selectedIdx];
}

// manual workaround due to the lack of API for selecting columns
/**
 * Scrolls to column.
 *
 * @param {string} columnKey
 * @param {UIColumn[]} columns
 * @param {number} selectedRow
 * @param {boolean} addOneToColIndex
 */
export function scrollToColumn(
    columnKey: string,
    columns: UIColumn[],
    selectedRow: number,
    addOneToColIndex = false
): void {
    const sidebar = document.querySelector('.data-editor__sidebar');
    const sidebarWidth = (sidebar?.getBoundingClientRect().width || 0) + (addOneToColIndex ? 20 : 0);
    const scrollContainer = document.querySelector('.ms-ScrollablePane--contentContainer');
    const cell = getCellFromCoords(selectedRow, columnKey, columns, addOneToColIndex);
    const box = cell && cell.getBoundingClientRect();

    if (scrollContainer && box) {
        const left = scrollContainer.scrollLeft + Math.ceil(box.x) - sidebarWidth;
        requestAnimationFrame(() => scrollContainer.scrollTo({ left, behavior: 'smooth' }));
    }
}

/**
 * Scrolls to row.
 *
 * @param {number} idx
 * @param {IDetailsList | null} table
 */
export function scrollToRow(idx = 0, table: IDetailsList | null) {
    if (!table) {
        return;
    }
    table.focusIndex(idx, false);
    const slctr = `.ms-DetailsList-contentWrapper .ms-DetailsRow[data-selection-index="${idx}"]`;
    waitFor(slctr)
        .then((rowEl) => {
            (rowEl as HTMLElement).setAttribute('tabIndex', '0');
            (rowEl as HTMLElement).click();
            (rowEl as HTMLElement).focus();
            showFocus();
        })
        .catch((e) => {
            throw e;
        });
}

/**
 * Wait for selector.
 *
 * @param {string} selector
 * @returns {Promise<Element>}
 */
export async function waitFor(selector: string) {
    const el = document.querySelector(selector);
    return new Promise((resolve) => {
        if (el) {
            resolve(el);
            return;
        }
        setTimeout(async () => {
            const el2 = await waitFor(selector);
            if (el2) {
                resolve(el2);
                return;
            }
        }, 100);
    });
}

/**
 * Adds row numbers.
 *
 * @param {any} columns
 * @param {boolean} showRowNumbers
 * @returns {any}
 */
export function addRowNumbers(columns: any, showRowNumbers = false): any {
    if (showRowNumbers && columns[0].key !== '__row_number__') {
        columns.unshift({
            key: '__row_number__',
            name: '#',
            fieldName: '__row_number__',
            minWidth: 24,
            maxWidth: 24,
            isResizable: false
        });
    }
    return columns;
}

export const _onHeaderRender: IRenderFunction<IDetailsHeaderProps> = (props, defaultRender?) => {
    if (!props || !defaultRender) {
        return null;
    }

    const customProps: IDetailsHeaderProps = {
        ...props,
        onRenderColumnHeaderTooltip: (item?, tooltipDefaultRender?) => {
            if (item?.column) {
                const column: UIColumn = item.column;
                const editable = (column.editable ? '' : 'not-') + 'editable-container';
                const containerDiv = column.key !== '__row_number__' ? <div className={editable}></div> : null;

                return (
                    <div className="data-editor__header-cell">
                        {column.iconName && (
                            <UIIcon className="type-icon" iconName={column.iconName} title={column.iconTooltip || ''} />
                        )}
                        <span title={column?.headerTooltip || column.name}>{column.name}</span>
                        {containerDiv}
                    </div>
                );
            }

            const isCheckTooltip = item?.hostClassName === 'ms-DetailsHeader-checkTooltip';
            if (props.selection && isCheckTooltip && tooltipDefaultRender) {
                return tooltipDefaultRender(item);
            }

            return null;
        }
    };

    return <Sticky>{defaultRender(customProps)}</Sticky>;
};

/**
 * Gets styles for selected cell.
 *
 * @param state
 * @returns {Partial<IDetailsListStyles>}
 */
export function getStylesForSelectedCell(state: UITableState): Partial<IDetailsListStyles> {
    let styles: Partial<IDetailsListStyles> = {};
    const editedRow = state.editedCell ? state.editedCell.rowIndex : undefined;
    const editedColumn = state.editedCell ? state.editedCell.column : undefined;

    if (editedRow !== undefined && editedColumn !== undefined) {
        styles = {
            root: {
                ['div.ms-List-cell']: {
                    position: 'relative',
                    zIndex: 0
                },
                [`div.ms-List-cell[data-list-index="${editedRow}"]`]: {
                    zIndex: 1
                },
                [`.ms-DetailsRow-cell`]: {
                    overflow: 'hidden'
                },
                [`div.ms-List-cell[data-list-index="${editedRow}"] .ms-DetailsRow-cell[data-automation-key="${editedColumn.key}"]`]:
                    {
                        overflow: 'visible'
                    }
            }
        };
    }

    return styles;
}

export function showFocus(): void {
    document.body.classList.remove('ms-Fabric--isFocusHidden');
    document.body.classList.add('ms-Fabric--isFocusVisible');
}

export function hideFocus(): void {
    document.body.classList.add('ms-Fabric--isFocusHidden');
    document.body.classList.remove('ms-Fabric--isFocusVisible');
}

/**
 * Gets ComboBox input.
 *
 * @param ref
 * @returns {HTMLInputElement | undefined }
 */
export function getComboBoxInput(ref?: React.RefObject<ComboBoxRef>): HTMLInputElement | undefined {
    const anyCombo = ref?.current as any;
    const anyComboDiv = anyCombo?.root.current;
    return anyComboDiv?.querySelector('input') as HTMLInputElement;
}
