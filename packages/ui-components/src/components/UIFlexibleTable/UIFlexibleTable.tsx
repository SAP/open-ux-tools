import type { CSSProperties } from 'react';
import React, { useEffect, useRef, useState } from 'react';
import { List } from 'react-movable';
import { UIDefaultButton, UILoader } from '..';
import { renderTitleRow, UIFlexibleTableRow } from './UIFlexibleTableRow';
import type { UIFlexibleTableRowProps } from './UIFlexibleTableRow';
import { UIFlexibleTableRowNoData } from './UIFlexibleTableRowNoData';
import { UIFlexibleTableLayout } from './types';
import type { NodeDragAndDropSortingParams, UIFlexibleTableProps, UIFlexibleTableRowType } from './types';

import './UIFlexibleTable.scss';
import { composeClassNames, getRowActionButtonId, getTableActionButtonId } from './utils';
import { RowActions } from './RowActions';
import { RowDataCells } from './RowData';

/**
 * @class {ResizeObserver}
 */
declare class ResizeObserver {
    observe: (prop: HTMLDivElement | null) => void;
    disconnect: () => void;
    /**
     * @param {unknown} callback
     */
    constructor(callback: unknown);
}

/**
 * UIFlexibleTable component.
 *
 * @exports
 * @param {UIFlexibleTableProps<T>} props
 * @returns {React.ReactElement}
 */
export function UIFlexibleTable<T>(props: UIFlexibleTableProps<T>): React.ReactElement {
    const [currentFocusedRowIndex, setCurrentFocusedRowIndex] = useState<number | undefined>();
    const [currentFocusedRowAction, setCurrentFocusedRowAction] = useState<string>('');
    const [isInRowLayout, setIsInRowLayout] = useState(props.layout === UIFlexibleTableLayout.InlineFlex);
    const [titleRowRightPadding, setTitleRowRightPadding] = useState(0);
    const [rowToNavigate, setRowToNavigate] = useState<number | undefined>();
    const scrollableElement: React.MutableRefObject<HTMLUListElement | null> = useRef(null);
    const tableRootElementRef: React.MutableRefObject<HTMLDivElement | null> = useRef(null);
    const contentElementRef = useRef(null);
    const tableBodyElementRef = useRef(null);
    const scrollTargetRef: React.MutableRefObject<HTMLDivElement | null> = useRef(null);

    const onResize = (element?: unknown): void => {
        setIsInRowLayout(
            props.layout === UIFlexibleTableLayout.InlineFlex &&
                isRowFitsContainer(props.inRowLayoutMinWidth, tableRootElementRef)
        );
        const rootContainer: HTMLDivElement | null = tableRootElementRef.current;
        if (element && props.onContentSizeChange && rootContainer) {
            props.onContentSizeChange({ height: rootContainer.clientHeight, width: rootContainer.clientWidth });
        }
    };

    const onScrollBarStateChange = (): void => {
        const content: HTMLDivElement | null = (contentElementRef as React.MutableRefObject<HTMLDivElement | null>)
            .current;
        const scrollableContent: HTMLUListElement | null = scrollableElement.current;
        const scrollBarSize = content && scrollableContent ? content.clientWidth - scrollableContent.clientWidth : 0;
        setTitleRowRightPadding(scrollBarSize);
    };

    const [resizeObserver] = useState(new ResizeObserver(onResize));
    const scrollBarObserver = useRef(new ResizeObserver(onScrollBarStateChange));

    useEffect(() => {
        if (tableRootElementRef.current) {
            resizeObserver.observe(tableRootElementRef.current);
            onResize();
        }
    }, [tableRootElementRef.current]);

    useEffect(() => {
        if (currentFocusedRowIndex !== undefined) {
            restoreFocus(currentFocusedRowAction, currentFocusedRowIndex, props.id);
        }
        if (!props.isContentLoading && scrollTargetRef.current) {
            scrollTargetRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            setRowToNavigate(undefined);
        }
    }, [props.isContentLoading, props.rows]);

    useEffect(() => {
        return () => {
            resizeObserver.disconnect();
        };
    }, []);

    useEffect(() => {
        onResize();
    }, [props.layout, props.maxWidth]);

    const reorderTable = (oldIndex: number, newIndex: number): void => {
        if (props.onTableReorder) {
            const result = props.onTableReorder({ oldIndex, newIndex });
            if (typeof result === 'object' && result.isDropDisabled) {
                return;
            }
            setCurrentFocusedRowIndex(newIndex);
        }
    };

    const addNewRow = (): void => {
        if (props.addRowButton?.onClick) {
            const result = props.addRowButton.onClick();
            if (result instanceof Promise) {
                result.then((data) => setRowToNavigate(data?.scrollToRow)).catch(() => undefined);
            } else {
                setRowToNavigate(result?.scrollToRow);
            }
        }
    };

    const onFocusRowAction = (rowIndex?: number, actionName = ''): void => {
        setCurrentFocusedRowIndex(rowIndex);
        setCurrentFocusedRowAction(actionName);
    };

    const renderRowActions = (rowIndex: number) => {
        return (
            <RowActions
                rowIndex={rowIndex}
                tableProps={props}
                onFocusRowAction={(actionName) => onFocusRowAction(rowIndex, actionName)}
                onMoveDownClick={() => reorderTable(rowIndex, rowIndex + 1)}
                onMoveUpClick={() => reorderTable(rowIndex, rowIndex - 1)}
            />
        );
    };

    const renderRowData = (params: NodeDragAndDropSortingParams): React.ReactElement => (
        <RowDataCells
            key={params.index || 0}
            isInRowLayout={isInRowLayout}
            row={params.value as UIFlexibleTableRowType<T>}
            rowIndex={params.index || 0}
            tableProps={props}
        />
    );

    /**
     * Renders row.
     *
     * @param {NodeDragAndDropSortingParams} params
     * @returns {React.ReactElement<UIFlexibleTableRowProps<T>, 'UIFlexibleTableRow'>}
     */
    function renderRow<T>(
        params: NodeDragAndDropSortingParams
    ): React.ReactElement<UIFlexibleTableRowProps<T>, 'UIFlexibleTableRow'> {
        const rowIndex: number | undefined = params.index;
        const { isDropWarning } = props.onRenderRowContainer
            ? props.onRenderRowContainer({
                  readonly: !!props.readonly,
                  rowIndex,
                  isDragged: params.isDragged
              })
            : { isDropWarning: false };

        return (
            <UIFlexibleTableRow
                key={`row-${rowIndex}`}
                dragAndDropParams={params}
                rowActions={renderRowActions(rowIndex || 0)}
                rowData={renderRowData(params)}
                tableProps={props}
                rowRef={typeof rowToNavigate === 'number' && rowIndex === rowToNavigate ? scrollTargetRef : undefined}
                className={isDropWarning ? 'highlight-drop-warning' : ''}
            />
        );
    }

    const renderTable = (params: {
        children: React.ReactNode;
        isDragged: boolean;
        props: {
            ref?: React.RefObject<any>;
        };
    }): React.ReactNode => {
        const ulElement = params.props.ref?.current;
        let { children } = params;

        if (ulElement && scrollableElement.current !== ulElement) {
            scrollableElement.current = ulElement;
            scrollBarObserver.current.observe(ulElement);
        }
        if (props.rows.length === 0 && props.noDataText) {
            children = (
                <UIFlexibleTableRowNoData
                    noRowBackground={props.noRowBackground}
                    reverseBackground={props.reverseBackground}>
                    {props.noDataText}
                </UIFlexibleTableRowNoData>
            );
        }
        return (
            <ul
                ref={params.props.ref}
                className={`flexible-table-content-table${params.isDragged ? ' dragged' : ''}`}
                style={{
                    cursor: params.isDragged ? 'grabbing' : 'default',
                    maxHeight: props.maxScrollableContentHeight ? `${props.maxScrollableContentHeight}px` : undefined
                }}>
                {children}
            </ul>
        );
    };

    const tableBody = getTableBody<T>(props, renderTable, renderRow, reorderTable, tableBodyElementRef);

    const tableClasses = composeClassNames('flexible-table', [
        props.layout === UIFlexibleTableLayout.InlineFlex ? 'inline-layout' : 'wrapping-layout',
        props.readonly ? 'readonly' : ''
    ]);

    const showTitleRow = props.showColumnTitles && isInRowLayout && !props.showColumnTitlesInCells;
    const tableRootElementStyle: CSSProperties = {
        maxWidth: props.maxWidth ? `${props.maxWidth}px` : '100%'
    };

    const getCustomTableActions = (
        actionsGenerator?: (params: { readonly: boolean }) => React.ReactElement[]
    ): JSX.Element[] => {
        if (actionsGenerator) {
            const customActions = actionsGenerator({ readonly: !!props.readonly });
            return customActions.map((actionElement) => (
                <React.Fragment key={`table-action-${actionElement.key}`}>
                    <div className="flexible-table-header-action">{actionElement}</div>
                </React.Fragment>
            ));
        }
        return [];
    };

    const primaryTableActions: React.ReactNode[] = getCustomTableActions(props.onRenderPrimaryTableActions);
    const secondaryTableActions: React.ReactNode[] = getCustomTableActions(props.onRenderSecondaryTableActions);
    const isEmptyHeader = !props.addRowButton && primaryTableActions.length + secondaryTableActions.length === 0;
    const contentClasses = composeClassNames('flexible-table-content', [
        props.rows.length === 0 && !props.noDataText ? 'empty-table' : '',
        props.isContentLoading ? 'loading' : '',
        isEmptyHeader ? 'empty-table-header' : ''
    ]);

    return (
        <div
            className={tableClasses}
            ref={tableRootElementRef}
            id={props.id}
            style={tableRootElementStyle}
            onBlur={() => {
                onFocusRowAction();
            }}>
            {isEmptyHeader ? (
                <></>
            ) : (
                <div className="flexible-table-header">
                    <div className="flexible-table-header-primary-actions">
                        {props.addRowButton && (
                            <div className="flexible-table-header-action">
                                <UIDefaultButton
                                    iconProps={{ iconName: 'Add' }}
                                    className="flexible-table-btn-add"
                                    id={getTableActionButtonId(props.id, 'add-row')}
                                    primary
                                    disabled={props.isAddItemDisabled || props.isContentLoading || props.readonly}
                                    onClick={addNewRow}
                                    title={props.addRowButton.title}>
                                    {props.addRowButton.label}
                                </UIDefaultButton>
                            </div>
                        )}
                        {primaryTableActions}
                    </div>
                    <div className="flexible-table-header-secondary-actions">{secondaryTableActions}</div>
                </div>
            )}

            <div className={contentClasses} ref={contentElementRef}>
                {showTitleRow && renderTitleRow(props, titleRowRightPadding)}
                {tableBody}
                {props.isContentLoading && (
                    <UILoader className={'uiLoaderXLarge flexible-table-overlay-loader'} blockDOM={true} />
                )}
            </div>
        </div>
    );
}

/**
 * Gets table body.
 *
 * @param {UIFlexibleTableProps<T>} props
 * @param {(params: { children: React.ReactNode; isDragged: boolean; props: { ref?: React.RefObject<any>; }; }) => React.ReactNode} renderTable
 * @param {( params: NodeDragAndDropSortingParams) => React.ReactElement<UIFlexibleTableRowProps<T>, 'UIFlexibleTableRow'>} renderRow
 * @param { (oldIndex: number, newIndex: number) => void} reorderTable
 * @param {React.MutableRefObject<any>} tableBodyElementRef
 * @returns {React.ReactNode}
 */
function getTableBody<T>(
    props: UIFlexibleTableProps<T>,
    renderTable: (params: {
        children: React.ReactNode;
        isDragged: boolean;
        props: {
            ref?: React.RefObject<any>;
        };
    }) => React.ReactNode,
    renderRow: (
        params: NodeDragAndDropSortingParams
    ) => React.ReactElement<UIFlexibleTableRowProps<T>, 'UIFlexibleTableRow'>,
    reorderTable: (oldIndex: number, newIndex: number) => void,
    tableBodyElementRef: React.MutableRefObject<any>
): React.ReactNode {
    let tableBody: React.ReactNode;
    const { rows } = props.onBeforeTableRender ? props.onBeforeTableRender({ rows: props.rows }) : { rows: props.rows };
    if (props.onTableReorder && !props.readonly) {
        tableBody = (
            <List
                values={rows}
                lockVertically={props.lockVertically}
                onChange={(params): void => reorderTable(params.oldIndex, params.newIndex)}
                renderList={(params): React.ReactNode => renderTable(params)}
                renderItem={(params): React.ReactNode => renderRow(params)}
                removableByMove={true}
                beforeDrag={props.onStartDragging}
            />
        );
    } else {
        const children = props.rows.map((row, index) => {
            const rowProps = {
                key: index
            };
            const dragAndDropParams = {
                index,
                isDragged: false,
                isOutOfBounds: false,
                isSelected: false,
                props: rowProps,
                value: row
            };
            return renderRow(dragAndDropParams);
        });
        tableBody = renderTable({ children, isDragged: false, props: { ...props, ref: tableBodyElementRef } });
    }
    return tableBody;
}

/**
 * Restores focus.
 *
 * @param {string} currentFocusedRowAction
 * @param {number | undefined} currentFocusedRowIndex
 * @param {string} tableId
 */
function restoreFocus(
    currentFocusedRowAction: string,
    currentFocusedRowIndex: number | undefined,
    tableId: string
): void {
    if (currentFocusedRowAction) {
        let actionElement = document.getElementById(
            getRowActionButtonId(tableId, currentFocusedRowIndex, currentFocusedRowAction)
        );
        if (actionElement) {
            if (!actionElement.hasAttribute('disabled')) {
                actionElement.focus();
            } else {
                if (currentFocusedRowAction === 'up') {
                    actionElement = document.getElementById(
                        getRowActionButtonId(tableId, currentFocusedRowIndex, 'down')
                    );
                } else {
                    actionElement = document.getElementById(
                        getRowActionButtonId(tableId, currentFocusedRowIndex, 'up')
                    );
                }
                if (actionElement) {
                    actionElement.focus();
                }
            }
        }
    }
}

/**
 * Check row fit container.
 *
 * @param {number | undefined} propThreshold
 * @param {React.MutableRefObject<HTMLDivElement | null>} containerRef
 * @returns {boolean}
 */
function isRowFitsContainer(
    propThreshold: number | undefined,
    containerRef: React.MutableRefObject<HTMLDivElement | null>
): boolean {
    let result = true;
    const inRowMinWidth = propThreshold ?? 600;
    const containerWidth = containerRef?.current?.clientWidth ?? 0;
    if (containerWidth) {
        result = containerWidth >= inRowMinWidth;
    }
    return result;
}
