import React from 'react';
import { UIFlexibleTableLayout } from './types';
import type { UIFlexibleTableProps, UIFlexibleTableRowType } from './types';
import { composeClassNames } from './utils';

interface RowDataCellsProps<T> {
    tableProps: UIFlexibleTableProps<T>;
    row: UIFlexibleTableRowType<T>;
    rowIndex: number;
    isInRowLayout: boolean;
}

/**
 * Get cell title element.
 *
 * @param {UIFlexibleTableProps<T>} tableProps
 * @param {React.ReactNode} title
 * @param {boolean} inRowLayout
 * @param {string} tooltip
 * @returns {React.ReactNode}
 */
function getCellTitleElement<T>(
    tableProps: UIFlexibleTableProps<T>,
    title: React.ReactNode,
    inRowLayout: boolean,
    tooltip?: string
): React.ReactNode {
    const wrappingLayout = tableProps.layout === UIFlexibleTableLayout.Wrapping;
    const isFlexContent = wrappingLayout || !inRowLayout || tableProps.showColumnTitlesInCells;
    if (tableProps.showColumnTitles && isFlexContent) {
        return (
            <div className="flexible-table-content-table-row-item-title" title={tooltip}>
                {title}
            </div>
        );
    } else {
        return <></>;
    }
}

/**
 * Gets row data cells.
 *
 * @param {RowDataCellsProps<T>} props
 * @returns {Array<React.ReactNode>}
 */
function getRowDataCells<T>(props: RowDataCellsProps<T>): Array<React.ReactNode> {
    const { isInRowLayout, row, rowIndex, tableProps } = props;
    const result: Array<React.ReactNode> = [];

    for (let i = 0; i < tableProps.columns.length; i++) {
        const column = tableProps.columns[i];
        if (column.hidden) {
            continue;
        }

        const colKey = column.key;
        const { content, isSpan, cellClassNames, title, tooltip } = tableProps.onRenderCell({
            cells: row.cells,
            colIndex: i,
            colKey,
            readonly: !!tableProps.readonly,
            rowIndex,
            rowKey: row.key,
            value: row.cells[colKey],
            isInRowLayout
        });

        if (tableProps.layout === UIFlexibleTableLayout.InlineFlex || content) {
            const classNameStr: string = composeClassNames('flexible-table-content-table-row-item-data-cells-wrapper', [
                cellClassNames,
                column.className
            ]);
            const cellId = `cell-${colKey}`;
            result.push(
                <div key={isSpan ? `cell-unknown` : `cell-${colKey}-${i}`} className={classNameStr} id={cellId}>
                    {getCellTitleElement(tableProps, title || column.title, isInRowLayout, tooltip || column.tooltip)}
                    <div className="flexible-table-content-table-row-item-data-cells-value">{content}</div>
                </div>
            );
        }

        if (isSpan) {
            break;
        }
    }
    return result;
}

/**
 * RowDataCells component.
 *
 * @param {RowDataCellsProps<T>} props
 * @returns {React.ReactElement}
 */
export function RowDataCells<T>(props: RowDataCellsProps<T>): React.ReactElement {
    const { isInRowLayout, row, rowIndex, tableProps } = props;
    const rowCells: Array<React.ReactElement> = [];
    const rowCellsData: Array<React.ReactNode> = [];
    let alternativeContent: React.ReactNode | undefined;

    if (tableProps.onRenderRowDataContent) {
        alternativeContent = tableProps.onRenderRowDataContent({
            cells: row.cells,
            readonly: !!tableProps.readonly,
            rowIndex,
            rowKey: row.key
        });
    }

    if (tableProps.showIndexColumn) {
        // Add index cell
        rowCells.push(
            <div key={`cell-index-${rowIndex}`} className="flexible-table-content-table-row-item-index">
                <span className="flexible-table-content-table-row-item-index-value">{row.key}</span>
            </div>
        );
    }

    if (!alternativeContent) {
        rowCellsData.push(...getRowDataCells(props));
    } else {
        rowCellsData.push(alternativeContent);
    }

    // Add data cells
    const classNames: string[] = ['flexible-table-content-table-row-item-data-cells'];
    if (tableProps.layout === UIFlexibleTableLayout.Wrapping) {
        classNames.push('dynamic');
    } else {
        classNames.push(isInRowLayout ? 'in-row' : 'in-column');
    }

    rowCells.push(
        <div key={`flexible-table-content-table-row-item-${rowIndex}`} className={classNames.join(' ')}>
            {rowCellsData}
        </div>
    );
    return <div className="flexible-table-content-table-row-item-wrapper">{rowCells}</div>;
}
