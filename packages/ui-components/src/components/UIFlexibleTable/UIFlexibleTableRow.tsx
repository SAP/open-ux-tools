import React from 'react';
import type { CSSProperties } from 'react';
import { UIFocusZone, UIFocusZoneDirection } from '..';
import { UIFlexibleTableLayout } from './types';
import type { UIFlexibleTableProps, UIFlexibleTableRowType, NodeDragAndDropSortingParams } from './types';
import { composeClassNames } from './utils';

export interface UIFlexibleTableRowProps<T> {
    dragAndDropParams: NodeDragAndDropSortingParams;
    rowActions: React.ReactElement;
    rowData: React.ReactElement;
    rowRef?: React.RefObject<HTMLDivElement>;
    tableProps: UIFlexibleTableProps<T>;
    className?: string;
}

/**
 * Render row title.
 *
 * @param {UIFlexibleTableProps<T>} props
 * @param {UIFlexibleTableRowType<T>} row
 * @param {number | undefined} rowIndex
 * @param {React.ReactElement} rowActions
 * @returns {React.ReactNode}
 */
function renderRowTitle<T>(
    props: UIFlexibleTableProps<T>,
    row: UIFlexibleTableRowType<T>,
    rowIndex: number | undefined,
    rowActions: React.ReactElement
): React.ReactNode {
    return (
        <div className="flexible-table-content-table-row-header">
            <div className="flexible-table-content-table-row-header-text-content" title={row.tooltip}>
                {row.title || <span></span>}
            </div>
            {props.layout === UIFlexibleTableLayout.Wrapping &&
                getActionsContainer(false, rowIndex, rowActions, 'flexible-table-content-table-row-header-actions')}
        </div>
    );
}

/**
 *
 * @param {boolean} useFocusZone
 * @param {number | undefined} rowIndex
 * @param {React.ReactElement} rowActions
 * @param {string} className
 * @returns {JSX.Element}
 */
function getActionsContainer(
    useFocusZone: boolean,
    rowIndex: number | undefined,
    rowActions: React.ReactElement,
    className: string
) {
    return useFocusZone ? (
        <UIFocusZone
            as="div"
            key={`cell-actions-${rowIndex ?? 'unknown'}`}
            className={className}
            direction={UIFocusZoneDirection.horizontal}
            isCircularNavigation={true}
            shouldEnterInnerZone={(ev: React.KeyboardEvent<HTMLElement>): boolean => ev.key === 'Enter'}>
            {rowActions}
        </UIFocusZone>
    ) : (
        <div className={className}>{rowActions}</div>
    );
}

/**
 * On render title row.
 *
 * @param {UIFlexibleTableProps<T>} props
 * @param {number} paddingRight
 * @returns {React.ReactNode}
 */
export function renderTitleRow<T>(props: UIFlexibleTableProps<T>, paddingRight: number): React.ReactNode {
    const rowCells: Array<React.ReactElement> = [];

    if (props.showIndexColumn) {
        if (props.onRenderTitleColumnCell) {
            const { content, cellClassNames, tooltip } = props.onRenderTitleColumnCell({
                isIndexColumn: true
            });
            const className = composeClassNames('flexible-table-content-table-title-row-item-index', [cellClassNames]);
            rowCells.push(
                <div key="title-cell-index" className={className} title={tooltip}>
                    {content}
                </div>
            );
        } else {
            rowCells.push(
                <div key="title-cell-index" className="flexible-table-content-table-title-row-item-index">
                    <span className="flexible-table-content-table-title-row-item-index-value">#</span>
                </div>
            );
        }
    }

    const rowCellsData: React.ReactNode[] = [];
    const tableId = props.id;
    for (let i = 0; i < props.columns.length; i++) {
        const column = props.columns[i];
        if (column.hidden) {
            continue;
        }
        const key = column.key;
        if (props.onRenderTitleColumnCell) {
            const { content, isSpan, cellClassNames, tooltip } = props.onRenderTitleColumnCell({
                colIndex: i,
                colKey: key
            });
            const className = composeClassNames('flexible-table-content-table-title-row-item-data-cells-value', [
                cellClassNames,
                column.className
            ]);
            if (isSpan) {
                rowCellsData.push(
                    <div
                        key={`title-cell-unknown`}
                        className={className}
                        title={tooltip || column.tooltip}
                        id={`${tableId}-header-column-${key}`}>
                        {content}
                    </div>
                );
                break;
            } else {
                rowCellsData.push(
                    <div
                        key={`cell-${key}-${i}`}
                        className={className}
                        title={tooltip || column.tooltip}
                        id={`${tableId}-header-column-${key}`}>
                        {content}
                    </div>
                );
            }
        } else {
            const className = composeClassNames('flexible-table-content-table-title-row-item-data-cells-value', [
                column.className
            ]);
            rowCellsData.push(
                <div
                    key={`title-cell-${key}-${i}`}
                    className={className}
                    title={column.tooltip}
                    id={`${tableId}-header-column-${key}`}>
                    {column.title}
                </div>
            );
        }
    }

    // Add data cells titles
    rowCells.push(
        <div
            key={`flexible-table-content-table-title-row-item-data-cells}`}
            className={`flexible-table-content-table-title-row-item-data-cells in-row`}>
            {rowCellsData}
        </div>
    );

    // Add actions title
    if (props.onRenderTitleColumnCell) {
        const { content, cellClassNames, tooltip } = props.onRenderTitleColumnCell({
            isActionsColumn: true
        });
        const className = composeClassNames('flexible-table-content-table-title-row-item-actions', [cellClassNames]);
        rowCells.push(
            <div key="title-row" className={className} title={tooltip}>
                {content}
            </div>
        );
    } else {
        rowCells.push(
            <div key={`title-cell-actions`} className="flexible-table-content-table-title-row-item-actions"></div>
        );
    }

    return (
        <div className="flexible-table-content-table-title-row" key="title-row" style={{ paddingRight }} tabIndex={-1}>
            <div className="flexible-table-content-table-title-row-wrapper">
                <div className="flexible-table-content-table-title-row-wrapper-cells">{rowCells}</div>
            </div>
        </div>
    );
}

/**
 * Method checks if passed row is disabled for drag.
 *
 * @param value Row item value.
 * @returns {boolean} Is row disabled for drag.
 */
function isRowDisabled(value: unknown): boolean {
    let disabled = false;
    if (value && typeof value === 'object' && 'disabled' in value) {
        disabled = !!value.disabled;
    }
    return disabled;
}

/**
 * Method returns CSS styles for row item element.
 *
 * @param isDragDisabled Is row disabled for drag.
 * @param isDragged True if row is currently dragging.
 * @param isTouchDragDisabled Is drag disabled by touch events.
 * @returns {string} CSS styles for row item element.
 */
function getRowStyles(isDragDisabled: boolean, isDragged: boolean, isTouchDragDisabled: boolean): CSSProperties {
    const style: CSSProperties = {
        pointerEvents: 'all',
        cursor: isDragged ? 'grabbing' : 'inherit',
        touchAction: 'none'
    };
    if (isDragDisabled) {
        style.cursor = 'default';
    }
    if (isDragDisabled || isTouchDragDisabled) {
        style.touchAction = 'auto';
    }
    return style;
}

/**
 * Method returns class name for row index parity.
 *
 * @param rowIndex Row index.
 * @returns {string} Class name string.
 */
function getParityClassName(rowIndex?: number): string {
    let className = '';
    if (rowIndex !== undefined) {
        // Index is zero based - odd/even opposite
        className = rowIndex % 2 === 0 ? 'odd' : 'even';
    }
    return className;
}

/**
 * UIFlexibleTableRow component.
 *
 * @exports
 * @param {UIFlexibleTableRowProps} props
 * @returns {JSX.Element}
 */
export function UIFlexibleTableRow<T>(props: UIFlexibleTableRowProps<T>) {
    const { dragAndDropParams: params, rowData, rowActions, rowRef, tableProps, className: dynamicClassName } = props;
    const row = params.value as UIFlexibleTableRowType<T>;
    const rowIndex = params.index;
    const rowCells: Array<React.ReactElement> = [];
    const { isDragged, isSelected, isOutOfBounds, value } = params;
    const isRow = row && rowIndex !== undefined;
    const isDragDisabled = isRowDisabled(value);
    if (isRow) {
        rowCells.push(rowData);

        if (tableProps.layout === UIFlexibleTableLayout.InlineFlex) {
            // Add row actions
            rowCells.push(
                getActionsContainer(true, rowIndex, rowActions, 'flexible-table-content-table-row-item-actions')
            );
        }
    }

    const rowClassName = composeClassNames('flexible-table-content-table-row', [
        tableProps.noRowBackground ? 'no-background' : '',
        isDragged ? 'dragged' : '',
        isSelected ? 'selected' : '',
        isOutOfBounds ? 'out-of-bounds' : '',
        row.className ?? '',
        tableProps.lockVertically ? 'locked-axis' : 'unlocked-axis',
        getParityClassName(rowIndex),
        tableProps.reverseBackground && !tableProps.noRowBackground ? 'reverse-background' : '',
        dynamicClassName
    ]);

    const rowWrapperClassNames = [
        'flexible-table-content-table-row-wrapper',
        tableProps.layout === UIFlexibleTableLayout.InlineFlex ? 'inline-layout' : 'wrapping-layout'
    ].join(' ');

    const showRowTitle = isRow && (tableProps.showRowTitles || tableProps.layout === UIFlexibleTableLayout.Wrapping);

    const style: CSSProperties = {
        ...params.props.style,
        ...getRowStyles(isDragDisabled, isDragged, !!tableProps.isTouchDragDisabled)
    };

    if (tableProps.isContentLoading) {
        style.pointerEvents = 'none';
        style.cursor = 'none';
    }
    let onTouchStart: ((event: React.TouchEvent) => void) | undefined;
    let onTouchEnd: ((event: React.TouchEvent) => void) | undefined;
    // Disable drag using touch events
    if (!isDragDisabled && tableProps.isTouchDragDisabled) {
        onTouchStart = (event: React.TouchEvent) => {
            event.nativeEvent.stopImmediatePropagation();
        };
        onTouchEnd = (event: React.TouchEvent) => {
            event.nativeEvent.stopImmediatePropagation();
        };
    }
    return (
        <li
            {...params.props}
            className={rowClassName}
            data-movable-handle
            key={`row-${rowIndex}`}
            id={`row-${rowIndex}`}
            style={style}
            onTouchStart={onTouchStart}
            onTouchEnd={onTouchEnd}>
            <div className={rowWrapperClassNames} ref={rowRef}>
                {showRowTitle && renderRowTitle(tableProps, row, rowIndex, rowActions)}
                <div className="flexible-table-content-table-row-wrapper-cells">{rowCells}</div>
            </div>
        </li>
    );
}
