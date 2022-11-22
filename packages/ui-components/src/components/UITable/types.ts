import type {
    IDetailsListProps,
    IScrollablePaneProps,
    IColumn,
    IDetailsHeaderProps,
    IRenderFunction,
    Selection
} from '@fluentui/react';
import './UITable.scss';
import type { MutableRefObject } from 'react';

export enum CalculationType {
    Addition,
    Subtraction,
    Multiplication,
    Division
}

export enum ColumnControlType {
    UITextInput,
    UIDropdown,
    UIBooleanSelect,
    UIDatePicker
}
export { CheckboxVisibility, SelectionMode, Selection, DetailsListLayoutMode, IDropdownOption } from '@fluentui/react';

export type UIDocument = { [key: string]: any };
export type UIColumn = IColumn & {
    type?: string;
    editable?: boolean;
    validate?: Function;
    iconName?: string;
    iconTooltip?: string;
    headerTooltip?: string;
    notEditableTooltip?: string;
    key?: string;
    text?: string;
    dataType?: string;
    isResizable?: boolean;
    includeColumnInExport?: boolean;
    includeColumnInSearch?: boolean;
    columnControlType?: ColumnControlType;
    calculatedColumn?: { type: CalculationType; fields: any[] };
    onChange?: any;
    maxLength?: number;
    applyColumnFilter?: boolean;
};

export interface EditedCell {
    rowIndex: number;
    item: UIDocument;
    column?: UIColumn;
    errorMessage?: string;
    newValue?: string;
}

export type UITableState = {
    columns: UIColumn[];
    items: UIDocument[];
    editedCell?: EditedCell;
    selectedColumnId?: string;
};

export type CellChangeHandler = (cell: EditedCell, value?: string) => void;

export const RenderInputs = {
    never: false,
    always: true
};

export type OwnProps = {
    dataSetKey: string;
    scrollablePaneProps?: IScrollablePaneProps;
    onSave?: CellChangeHandler;
    onSelectionChange?: Function;
    selectionRef?: MutableRefObject<Selection | null>;
    columns: UIColumn[];
    selectedRow?: number;
    selectedColumnId?: string;
    showRowNumbers?: boolean;
    headerRenderer?: IRenderFunction<IDetailsHeaderProps>;
    renderInputs?: boolean;
    scrollToAddedRow?: boolean;
};

export type UITableProps = OwnProps & IDetailsListProps;
