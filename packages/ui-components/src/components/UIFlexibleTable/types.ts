import type { IItemProps } from 'react-movable/lib/types';

export enum UIFlexibleTableLayout {
    InlineFlex = 'InlineFlex',
    Wrapping = 'Wrapping'
}
export interface UIFlexibleTableColumnType {
    title: string;
    key: string;
    className?: string;
    hidden?: boolean;
    tooltip?: string;
}

export type TableRowCells<T> = { [key: string]: T };

export interface UIFlexibleTableRowType<T> {
    key: string;
    cells: TableRowCells<T>;
    title?: string;
    className?: string;
    tooltip?: string;
}

export interface TableRowEventHandlerParameters<T> {
    readonly: boolean;
    rowIndex: number;
    rowKey: string;
    cells: TableRowCells<T>;
}

export interface TitleCellRendererParams {
    colIndex?: number;
    colKey?: string;
    isActionsColumn?: boolean;
    isIndexColumn?: boolean;
}

export interface CellRendererParams<T> extends TableRowEventHandlerParameters<T> {
    colIndex: number;
    colKey: string;
    isInRowLayout: boolean;
    value: T;
}

export interface CellRendererResult {
    content: React.ReactNode;
    title?: string | React.ReactNode;
    isSpan?: boolean;
    cellClassNames?: string | string[];
    tooltip?: string;
}

export type AddRowResultType = { scrollToRow?: number } | undefined;

export interface UIFlexibleTableProps<T> {
    addRowButton?: {
        label: string;
        title?: string;
        onClick?: () => AddRowResultType | Promise<AddRowResultType>;
    };
    columns: UIFlexibleTableColumnType[];
    id: string;
    isAddItemDisabled?: boolean;
    isContentLoading?: boolean;
    inRowLayoutMinWidth?: number; // threshold (in pixels) for table container size, when size gets smaller than limit row cells rendering switches from horizontal to vertical direction
    layout: UIFlexibleTableLayout;
    maxScrollableContentHeight?: number;
    maxWidth?: number;
    noRowBackground?: boolean; // disables zebra-colored row background
    onBeforeTableRender?: (params: { rows: UIFlexibleTableRowType<T>[] }) => {
        rows: (UIFlexibleTableRowType<T> & { disabled: boolean })[];
    }; // should be used to disable certain rows dragging - just remaps rows with additional flag dragDisabled
    onDeleteRow?: (params: TableRowEventHandlerParameters<T>) => void;
    onRenderPrimaryTableActions?: (params: { readonly: boolean }) => React.ReactElement[];
    onRenderSecondaryTableActions?: (params: { readonly: boolean }) => React.ReactElement[];
    onRenderActions?: (params: TableRowEventHandlerParameters<T>) => React.ReactElement[];
    onRenderReorderActions?: (params: TableRowEventHandlerParameters<T>) =>
        | undefined
        | {
              // allows dynamic disabling row reordering
              up?: {
                  disabled: boolean;
                  tooltip?: string;
              };
              down?: {
                  disabled: boolean;
                  tooltip?: string;
              };
          };
    onRenderDeleteAction?: (params: TableRowEventHandlerParameters<T>) => {
        // allows dynamic disabling row deletion
        isDeleteDisabled: boolean;
        tooltip?: string;
    };
    onStartDragging?: (params: { elements: Element[]; index: number }) => void;
    onRenderRowContainer?: (params: { readonly: boolean; rowIndex?: number; isDragged: boolean }) => {
        isDropWarning?: boolean;
    };
    onRenderCell: (params: CellRendererParams<T>) => CellRendererResult;
    onRenderRowDataContent?: (params: TableRowEventHandlerParameters<T>) => React.ReactNode | undefined; // allows to substitute entire row data with alternative content (index cell and row actions are not affected)
    onRenderTitleColumnCell?: (params: TitleCellRendererParams) => CellRendererResult;
    onTableReorder?: (params: { oldIndex: number; newIndex: number }) => void | {
        isDropDisabled: boolean;
    };
    onContentSizeChange?: (params: { height: number; width: number }) => void;
    readonly?: boolean;
    rows: UIFlexibleTableRowType<T>[];
    showIndexColumn?: boolean;
    showColumnTitles?: boolean;
    showColumnTitlesInCells?: boolean;
    showRowTitles?: boolean;
    lockVertically?: boolean;
    reverseBackground?: boolean;
    noDataText?: string | React.ReactElement;
}

export interface NodeDragAndDropSortingParams {
    index?: number;
    isDragged: boolean;
    isOutOfBounds: boolean;
    isSelected: boolean;
    props: IItemProps;
    value: unknown;
}

export enum UIFlexibleTableNoDataAlignment {
    Left = 'left',
    Right = 'right',
    Center = 'center'
}
