import React from 'react';
import type {
    IDetailsListCheckboxProps,
    ITextField,
    IDetailsList,
    IDetailsListProps,
    IDetailsListStyles,
    IDropdown,
    IDetailsRowFieldsProps,
    IDetailsColumnFieldProps,
    IRenderFunction,
    IComboBoxOption
} from '@fluentui/react';
import {
    DetailsList,
    ScrollablePane,
    Selection,
    CheckboxVisibility,
    DetailsRow,
    DetailsListLayoutMode,
    ConstrainMode,
    SelectionMode,
    DetailsRowFields,
    FocusZoneDirection
} from '@fluentui/react';

import { UICheckbox } from '../UICheckbox';
import { UITextInput } from '../UIInput';
import { UIDropdown } from '../UIDropdown';
import type { ComboBoxRef } from '../UIComboBox';
import { UIComboBox } from '../UIComboBox';
import { UIDatePicker } from '../UIDatePicker';
import {
    scrollToColumn,
    addRowNumbers,
    _copyAndSort,
    _onHeaderRender,
    focusEditedCell,
    getStylesForSelectedCell,
    showFocus,
    hideFocus,
    scrollToRow,
    getComboBoxInput
} from './UITable-helper';
import type { UITableProps, UITableState, UIDocument, UIColumn, EditedCell } from './types';
import { ColumnControlType } from './types';
import './UITable.scss';

/**
 * UITable component
 * based on: https://developer.microsoft.com/en-us/fluentui#/controls/web/detailslist
 *
 * @exports
 * @class {UITable}
 * @extends {React.Component<UITableProps, UITableState>}
 */
export class UITable extends React.Component<UITableProps, UITableState> {
    private tableRef: React.RefObject<IDetailsList>;
    private inputRefs?: {
        [key: string]: {
            [key: string]: React.RefObject<ITextField | IDropdown | ComboBoxRef> | undefined;
        };
    } = {};
    private selection: Selection;
    private onDocMousedown: any;
    private activeElement: EditedCell = {} as EditedCell;

    /**
     * Initializes component properties.
     *
     * @param props
     */
    constructor(props: UITableProps) {
        super(props);
        this.state = {
            columns: props.columns || [],
            items: props.items || []
        };

        this.tableRef = React.createRef();

        this.selection = new Selection({
            onSelectionChanged: (): void => {
                if (typeof this.props.onSelectionChange !== 'function') {
                    return;
                }
                this.props.onSelectionChange(this.selection.getSelectedIndices());
            }
        });

        if (this.props.selectionRef) {
            this.props.selectionRef.current = this.selection;
        }

        this.onTextInputChange = this.onTextInputChange.bind(this);
        this.onComboBoxChange = this.onComboBoxChange.bind(this);
        this.onDocumentMousedown = this.onDocumentMousedown.bind(this);
        this.onKeyDown = this.onKeyDown.bind(this);
        this.onComboBoxKeyDownCapture = this.onComboBoxKeyDownCapture.bind(this);
        this.validateCell = this.validateCell.bind(this);
        this.editNextCell = this.editNextCell.bind(this);
        this._onColumnClick = this._onColumnClick.bind(this);
        this._onCellRender = this._onCellRender.bind(this);
        this._onRenderCheckbox = this._onRenderCheckbox.bind(this);
        this._onRenderField = this._onRenderField?.bind(this);
        this._onRenderRow = this._onRenderRow?.bind(this);
        this._onRenderItemColumn = this._onRenderItemColumn?.bind(this);
        this._onCellActivation = this._onCellActivation?.bind(this);
    }

    componentDidMount(): void {
        this.onDocMousedown = this.onDocumentMousedown;
        document.addEventListener('mousedown', this.onDocMousedown, true);

        window.dispatchEvent(new Event('resize'));
        this._setTextRefs();
    }

    componentWillUnmount(): void {
        document.removeEventListener('mousedown', this.onDocMousedown);
    }

    /**
     * On component update.
     *
     * @param prevProps
     * @param prevState
     */
    componentDidUpdate(prevProps: UITableProps, prevState: UITableState): void {
        const scrollContainer = document.querySelector('.ms-ScrollablePane--contentContainer');
        if (scrollContainer) {
            const left = scrollContainer.scrollLeft || 0;
            requestAnimationFrame(() => (scrollContainer.scrollLeft = left));
        }

        if (prevProps.items !== this.props.items) {
            this.setState({ items: this.props.items });
            this._setTextRefs();
        }

        if (prevProps.columns !== this.props.columns) {
            this.setState({ columns: this.props.columns });
        }

        if (prevProps.dataSetKey !== this.props.dataSetKey) {
            this.setState({ editedCell: undefined });
        }

        if (typeof this.props.selectedRow !== 'undefined' && prevProps.selectedRow !== this.props.selectedRow) {
            scrollToRow(this.props.selectedRow, this.tableRef?.current);
        }

        if (this.props.scrollToAddedRow) {
            const dataSetChanged = this.props.dataSetKey !== prevProps.dataSetKey;
            const { items } = this.state;
            const { items: prevItems } = prevState;
            const itemsDelta = items.length - prevItems.length;
            const shouldScrollToNewRow = !dataSetChanged && itemsDelta === 1;
            if (shouldScrollToNewRow && this.tableRef && this.tableRef.current) {
                const newRowIndex = items.length - 1;
                this.tableRef.current.scrollToIndex(newRowIndex);
            }
        }

        const { selectedColumnId } = this.props;
        const { selectedColumnId: prevSelectedColumnId } = prevProps;
        // Due to table rendering using columns data from state, instead of props,
        // to sync selected column change callback with rendered dataset change
        // selected column id/key needs to be stored on a state level along with columns data
        if (selectedColumnId !== prevSelectedColumnId) {
            this.setState({ selectedColumnId });
        }

        const columnIsSelected = typeof this.state.selectedColumnId !== 'undefined';
        const selectedColumnDidChange = prevState.selectedColumnId !== this.state.selectedColumnId;
        if (columnIsSelected && selectedColumnDidChange) {
            scrollToColumn(
                this.state.selectedColumnId || '',
                this.state.columns,
                this.props.selectedRow || 0,
                this.props.showRowNumbers
            );
        }
    }

    private _setTextRefs(): void {
        if (this.props.columns && this.props.items) {
            for (const rowIndexTmp in this.props.items) {
                for (const col of this.props.columns as UIColumn[]) {
                    if (col.editable === true && this.inputRefs) {
                        this.inputRefs[rowIndexTmp] = this.inputRefs[rowIndexTmp] || {};
                        this.inputRefs[rowIndexTmp][col.key] = React.createRef();
                    }
                }
            }
        }
    }

    /**
     * On render row fields event.
     *
     * @param props
     * @returns {JSX.Element}
     */
    private renderRowFields(props: IDetailsRowFieldsProps) {
        // disabled is set to false when selectionMode === undefined || selectionMode === SelectionMode.single
        let disabled = false;
        const selectionMode = this.props.selectionMode;
        if (selectionMode === SelectionMode.multiple || selectionMode === SelectionMode.none) {
            disabled = true;
        }

        return (
            <div data-selection-disabled={disabled}>
                <DetailsRowFields {...props} />
            </div>
        );
    }

    /**
     * On render field event.
     *
     * @param props
     * @param defaultRender
     * @returns {null | JSX.Element}
     */
    private _onRenderField(
        props?: IDetailsColumnFieldProps,
        defaultRender?: IRenderFunction<IDetailsColumnFieldProps>
    ) {
        if (!props || !defaultRender) {
            return null;
        }
        const cell = defaultRender(props);
        const onClick = (e: React.MouseEvent<HTMLElement, MouseEvent> | null) => {
            const target = e?.target as HTMLElement;
            const targetTag = target?.tagName;
            if (['INPUT', 'TEXTAREA', 'SELECT'].includes(targetTag)) {
                return;
            }
            const { item, rowIndex, column } = this.activeElement;
            this._onCellClick(e, item, rowIndex || 0, column);
        };
        // in app-migrator, show a warning message for library projects on main migration view
        if (props.item.hideCells && props.column.fieldName === 'moduleName' && !props.item.status) {
            return (
                <div {...(cell?.props || {})} data-is-focusable={true} onClick={onClick} tabIndex="0">
                    {cell?.props?.children || null}
                    <div className="table-item-warning">
                        This is a reuse library and does not require input during migration
                    </div>
                </div>
            );
        } else {
            return (
                <div {...(cell?.props || {})} data-is-focusable={true} onClick={onClick} tabIndex="0">
                    {cell?.props?.children || null}
                </div>
            );
        }
    }

    // just sets the active element property on the table, to track it later
    /**
     * On cell activation event.
     *
     * @param item
     * @param rowIndex
     * @param ev
     */
    private _onCellActivation(item: UIDocument, rowIndex?: number, ev?: React.FocusEvent<HTMLElement>): void {
        const rowEl = ev?.target?.closest('.ms-DetailsRow');
        let column: UIColumn = {} as UIColumn;

        const cells = rowEl?.querySelectorAll('.ms-DetailsRow-fields .ms-DetailsRow-cell');
        if (!cells || !cells.length) {
            return;
        }

        // focusing cell, not the row
        const cellEl = ev?.target?.closest('.ms-DetailsRow-cell');
        if (cellEl) {
            const cellIdx = Array.from(cells).indexOf(cellEl);
            if (cellIdx === -1) {
                return;
            }
            column = this.props.columns[cellIdx];
            if (!column) {
                return;
            }
        }

        this.activeElement = { item, rowIndex: rowIndex || 0, column };

        if (this.props.renderInputs && column?.editable) {
            const isDropdown = this.activeElement?.column?.columnControlType === ColumnControlType?.UIDropdown;
            if (!isDropdown && this.state.editedCell?.column?.key !== this.activeElement?.column?.key) {
                this.setState({ editedCell: this.activeElement });
            }
        }
    }

    private _onRenderRow: IDetailsListProps['onRenderRow'] = (props) => {
        if (!props) {
            return null;
        }
        const toggle = !!this.props.renderInputs;
        return <DetailsRow data-selection-toggle={toggle} rowFieldsAs={this.renderRowFields.bind(this)} {...props} />;
    };

    /**
     * On render item  column event.
     *
     * @param {UIDocument} item
     * @param {number} index
     * @param {UIColumn} column
     * @returns {React.ReactNode}
     */
    private _onRenderItemColumn(item: UIDocument, index?: number, column?: UIColumn): React.ReactNode {
        if (column?.key === '__row_number__') {
            return <div className="ms-DetailsList-row-number">{(index || 0) + 1}</div>;
        }
        return item[column?.fieldName || ''] || '';
    }

    // Replace weird radio-button-checkboxes with proper checkboxes
    /**
     * On render checkbox event.
     *
     * @param {IDetailsListCheckboxProps | undefined} props
     * @returns {React.ReactElement}
     */
    private _onRenderCheckbox(props: IDetailsListCheckboxProps | undefined): React.ReactElement {
        return <UICheckbox {...props} />;
    }

    // COLUMN HEADER SORT
    /**
     * On column click event.
     *
     * @param ev
     * @param column
     */
    private _onColumnClick(ev: React.MouseEvent<HTMLElement>, column: UIColumn): void {
        const { columns, items } = this.state;
        const newColumns: UIColumn[] = columns.slice();
        const currColumn: UIColumn = newColumns.filter((currCol) => column.key === currCol.key)[0];
        newColumns.forEach((newCol: UIColumn) => {
            if (newCol === currColumn) {
                currColumn.isSortedDescending = !currColumn.isSortedDescending;
                currColumn.isSorted = true;
            } else {
                newCol.isSorted = false;
                newCol.isSortedDescending = false;
            }
        });
        const field = currColumn.fieldName || currColumn.name || '';
        const newItems = _copyAndSort(items, field, currColumn.isSortedDescending);
        this.setState({ columns: newColumns, items: newItems });
    }

    // CELL EDITING
    /**
     * On start edit event call.
     *
     * @param rowIndex
     * @param item
     * @param column
     * @param errorMessage
     */
    private startEdit(rowIndex: number, item: UIDocument, column?: UIColumn, errorMessage?: string): void {
        const { editedCell } = this.state;
        const isAlreadyInEdit =
            editedCell?.rowIndex === rowIndex && column?.key && editedCell?.column?.key === column?.key;

        if (!isAlreadyInEdit) {
            this.setState({ editedCell: { rowIndex, item, column, errorMessage } });
            if (!this.props.renderInputs) {
                this.rerenderTable();
            }
        }
        requestAnimationFrame(() => {
            if (column?.columnControlType === ColumnControlType.UITextInput) {
                (this.inputRefs?.[rowIndex][column?.key] as React.RefObject<ITextField>)?.current?.select();
            } else if (column?.columnControlType === ColumnControlType.UIBooleanSelect) {
                const combo = this.inputRefs?.[rowIndex][column?.key] as React.RefObject<ComboBoxRef>;
                getComboBoxInput(combo)?.focus();
            } else if (column?.columnControlType === ColumnControlType.UIDatePicker) {
                (this.inputRefs?.[rowIndex][column?.key] as React.RefObject<ITextField>)?.current?.select();
            } else if (column?.key) {
                const otherElement = this.inputRefs?.[rowIndex][column.key]?.current as unknown;
                (otherElement as HTMLElement).focus();
            }
        });
    }

    private rerenderTable(): void {
        if (this.tableRef.current) {
            this.tableRef.current.forceUpdate();
        }
    }

    private cancelEdit(): void {
        this.setState({ editedCell: undefined });
        this.rerenderTable();
    }

    /**
     * On save cell event.
     *
     * @param cancelEdit
     * @param value
     */
    private saveCell(cancelEdit = false, value?: any): void {
        if (typeof this.props.onSave === 'function' && this.state.editedCell) {
            const { rowIndex, column } = this.state.editedCell;

            if (column?.columnControlType !== ColumnControlType.UIDropdown && !this.state.editedCell.errorMessage) {
                let compRef: React.RefObject<ITextField | IDropdown | ComboBoxRef> | undefined;
                if (column && this?.inputRefs?.[rowIndex]?.[column.key]) {
                    compRef = this?.inputRefs[rowIndex][column.key];
                }
                const currentValue = column && this.props.items[rowIndex][column.key];

                let refValue = '';
                if (column?.columnControlType === ColumnControlType.UITextInput) {
                    refValue = (compRef as React.RefObject<ITextField>)?.current?.value || '';
                } else if (column?.columnControlType === ColumnControlType.UIDatePicker) {
                    refValue = (compRef as React.RefObject<ITextField>)?.current?.value || '';
                } else if (column?.columnControlType === ColumnControlType.UIBooleanSelect) {
                    const combo = compRef as React.RefObject<ComboBoxRef>;
                    refValue = getComboBoxInput(combo)?.value || '';
                }

                const newValue = value ?? refValue;

                if (currentValue !== newValue) {
                    this.props.onSave(this.state.editedCell, newValue);
                }

                const item = this.state.editedCell?.item;
                const field = column?.fieldName;

                if (field && item) {
                    item[field] = newValue;
                }
            }
        }
        if (cancelEdit) {
            this.cancelEdit();
        }
    }

    /**
     * On mouse down event.
     *
     * @param e
     */
    private onDocumentMousedown(e: React.MouseEvent): void {
        const target = e.target as HTMLElement; // needed for TSC
        if (
            target.closest('.ms-TextField, .ms-ComboBox, .ms-ComboBox-option, .ui-DatePicker') &&
            !this.props.renderInputs
        ) {
            return;
        }
        if (this.state.editedCell) {
            if (this.state.editedCell.errorMessage) {
                e.preventDefault();
            } else {
                this.saveCell(true);
            }
        }
    }

    /**
     * On key down event.
     *
     * @param {React.KeyboardEvent<Element | IDropdown>} e
     * @returns {void}
     */
    private onKeyDown(e: React.KeyboardEvent<Element | IDropdown>): void {
        if (!['Enter', 'Tab', 'Escape', 'ArrowDown', 'ArrowUp', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
            return;
        }

        const isArrow = ['ArrowDown', 'ArrowUp', 'ArrowLeft', 'ArrowRight'].includes(e.key);
        const isInput = (e.target as HTMLElement).tagName === 'INPUT';
        if (isArrow && isInput) {
            e.stopPropagation();
            return;
        }

        e.preventDefault();

        if (e.key === 'Escape') {
            this.cancelEdit();
            focusEditedCell(this.state.editedCell, this.props);
            showFocus();
            return;
        }

        if (this.state.editedCell?.errorMessage) {
            return;
        }

        e.stopPropagation();

        if (e.key === 'Enter' || e.key === 'Tab') {
            this.editNextCell(e.key, e.shiftKey);
        }
    }

    /**
     * On ComboBox keydown event call.
     *
     * @param e
     */
    private onComboBoxKeyDownCapture(e: React.KeyboardEvent<Element | IDropdown>): void {
        if (e.key === 'Enter' || e.key === 'Tab') {
            // stop Enter from opening combobox
            e.stopPropagation();
            e.preventDefault();

            this.editNextCell(e.key, e.shiftKey);
        }
    }

    /**
     * On Edit next cell.
     *
     * @param key
     * @param shiftKey
     */
    private editNextCell(key: string, shiftKey: boolean): void {
        this.saveCell();

        let direction = '';
        if (key === 'Enter') {
            direction = shiftKey ? 'up' : 'down';
        } else if (key === 'Tab') {
            direction = shiftKey ? 'left' : 'right';
        }
        if (direction) {
            hideFocus();
        }
        setTimeout(() => {
            focusEditedCell(this.state.editedCell, this.props, direction)
                .then(() => {
                    if (!direction) {
                        showFocus();
                        return;
                    }
                    hideFocus();
                    const { rowIndex, item, column } = this.activeElement;
                    this.startEdit(rowIndex, item, column);
                })
                .catch((e) => {
                    throw e;
                });
        }, 100);
    }

    /**
     * On Cell click.
     *
     * @param e
     * @param item
     * @param rowIndex
     * @param column
     */
    private _onCellClick(
        e: React.MouseEvent<HTMLElement, MouseEvent> | null,
        item: UIDocument,
        rowIndex: number,
        column: UIColumn | undefined
    ): void {
        const previousCellHasErrors = this.state.editedCell?.errorMessage;
        if (previousCellHasErrors) {
            return;
        }
        if (this.props.renderInputs) {
            return;
        }

        const el = e?.target as HTMLElement;
        requestAnimationFrame(() => {
            // check the checkbox & focus the clicked cell
            if (el) {
                const fz = el.closest('.ms-FocusZone') as HTMLElement;
                if (fz && fz.click) {
                    fz.click();
                }
                const cell = el.closest('.ms-DetailsRow-cell') as HTMLElement;
                if (cell && cell.focus) {
                    cell.focus();
                }
            }
            if (column?.editable !== true) {
                showFocus();
            }
        });

        if (rowIndex !== undefined && item && column && column.editable === true) {
            e?.stopPropagation();
            requestAnimationFrame(() => this.startEdit(rowIndex, item, column));
        }
    }

    /**
     * Validates cell.
     *
     * @param value
     */
    private validateCell(value: string): void {
        const editedCell = this.state.editedCell;
        const column = editedCell?.column;
        let errorMessage = '';
        if (column && typeof column.validate === 'function') {
            errorMessage = column.validate(value);
        }
        if (editedCell && editedCell.errorMessage !== errorMessage) {
            editedCell.errorMessage = errorMessage || undefined;
            this.setState({ editedCell });
            this.rerenderTable();
        }
    }

    /**
     * On Text input change.
     *
     * @param e
     * @param newValue
     */
    private onTextInputChange(e: React.FormEvent<HTMLInputElement | HTMLTextAreaElement>, newValue = ''): void {
        const editedCell = this.state.editedCell || this.activeElement;
        if (editedCell) {
            editedCell.newValue = newValue;
        }
        this.setState({ editedCell });
        const column = editedCell?.column;
        if (column && typeof column.validate === 'function') {
            this.validateCell(newValue);
        }
        if (this.props.renderInputs) {
            this.saveCell(false, newValue);
        }
    }

    private onComboBoxChange = (option?: IComboBoxOption): void => {
        const editedCell = this.state.editedCell || this.activeElement;
        if (editedCell && option) {
            editedCell.newValue = option.text;
        }
        this.setState({ editedCell });
    };

    private readonly onDropdownCellValueChange = (
        selectedOption: any,
        item: UIDocument,
        rowIndex: number | undefined,
        column: UIColumn | undefined
    ): void => {
        const newValue = selectedOption.key;
        if (
            typeof this.props.onSave === 'function' &&
            typeof rowIndex === 'number' &&
            Number.isInteger(rowIndex) &&
            column
        ) {
            const currentValue = this.props.items[rowIndex][column.key];
            const editedCell = { rowIndex, item, column, errorMessage: undefined } as EditedCell;
            if (currentValue !== newValue) {
                this.props.onSave(editedCell, newValue);
            }
            const field = column?.fieldName;

            if (field && item) {
                item[field] = newValue;
            }
        }
        this.cancelEdit();
    };

    /**
     * Gets input ref.
     *
     * @param rowIndex
     * @param column
     * @returns { React.RefObject<ITextField | IDropdown | UIComboBox> | undefined}
     */
    private _getInputRef(
        rowIndex: number | undefined,
        column: UIColumn | undefined
    ): React.RefObject<ITextField | IDropdown | UIComboBox> | undefined {
        return typeof rowIndex === 'number' && typeof column?.key === 'string'
            ? this?.inputRefs?.[rowIndex]?.[column.key]
            : undefined;
    }

    /**
     * Renders dropdown.
     *
     * @param item
     * @param rowIndex
     * @param column
     * @returns {any}
     */
    private _renderDropdown(item: UIDocument, rowIndex: number | undefined, column: UIColumn | undefined): any {
        const compRef = this._getInputRef(rowIndex, column) as React.RefObject<IDropdown>;
        return (
            <UIDropdown
                id={`dropdown_row${rowIndex}_col${column?.key}`}
                hidden={item.hideCells ?? false}
                placeholder="Select an option"
                componentRef={compRef}
                options={column?.data.dropdownOptions}
                defaultSelectedKey={
                    typeof column?.key === 'string' && item[column?.key]
                        ? item[column?.key]
                        : column?.data.defaultSelectedKey
                }
                onChange={(ev, text) => this.onDropdownCellValueChange(text, item, rowIndex, column)}
                onKeyDown={this.onKeyDown}
            />
        );
    }

    /**
     * Renders boolean select.
     *
     * @param item
     * @param rowIndex
     * @param column
     * @returns {any}
     */
    private _renderBooleanSelect(item: UIDocument, rowIndex?: number, column?: UIColumn): any {
        const compRef = this._getInputRef(rowIndex, column) as React.RefObject<ComboBoxRef>;
        const newValue = this.state.editedCell?.newValue;

        let value;
        if (column?.fieldName) {
            value = item[column?.fieldName];
        }
        if (typeof newValue !== 'undefined') {
            value = newValue;
        }

        return (
            <UIComboBox
                defaultSelectedKey={value}
                allowFreeform={false}
                autoComplete="on"
                shouldRestoreFocus={false}
                componentRef={compRef}
                errorMessage={this.state.editedCell?.errorMessage}
                openMenuOnClick={false}
                onPendingValueChanged={this.onComboBoxChange}
                onKeyDown={this.onKeyDown}
                onKeyDownCapture={this.onComboBoxKeyDownCapture}
                onClick={(e): void => {
                    e.stopPropagation();
                }}
                options={[
                    { key: 'true', text: 'true' },
                    { key: 'false', text: 'false' }
                ]}
            />
        );
    }

    /**
     * Renders date picker.
     *
     * @param item
     * @param rowIndex
     * @param column
     * @param dateOnly
     * @returns {any}
     */
    private _renderDatePicker(item: UIDocument, rowIndex?: number, column?: UIColumn, dateOnly = true): any {
        const compRef = this._getInputRef(rowIndex, column) as React.RefObject<ITextField>;
        const newValue = this.state.editedCell?.newValue;

        let value;
        if (column?.fieldName) {
            value = item[column?.fieldName];
        }
        if (typeof newValue !== 'undefined') {
            value = newValue;
        }

        return (
            <UIDatePicker
                defaultValue={value}
                componentRef={compRef}
                dateOnly={dateOnly}
                errorMessage={this.state.editedCell?.errorMessage}
                onChange={this.onTextInputChange}
                onKeyDown={this.onKeyDown}
                onClick={(e): void => {
                    e.stopPropagation();
                }}
            />
        );
    }

    /**
     * Renders text input.
     *
     * @param item
     * @param rowIndex
     * @param column
     * @returns {any}
     */
    private _renderTextInput(item: UIDocument, rowIndex: number, column: UIColumn | undefined): any {
        const compRef = this._getInputRef(rowIndex, column) as React.RefObject<ITextField>;
        const newValue = this.state.editedCell?.newValue;
        let element;
        let value;
        if (column?.fieldName) {
            value = item[column?.fieldName];
        }
        if (typeof newValue !== 'undefined') {
            value = newValue;
        }
        if (!item.hideCells) {
            element = (
                <UITextInput
                    defaultValue={value}
                    componentRef={compRef}
                    errorMessage={this.state.editedCell?.errorMessage}
                    onChange={this.onTextInputChange}
                    onKeyDown={this.onKeyDown}
                    onClick={(e): void => {
                        e.stopPropagation();
                    }}
                />
            );
        }
        return element;
    }

    /**
     * On cell render.
     *
     * @param item
     * @param rowIndex
     * @param column
     * @returns {any}
     */
    private _onCellRender(item: UIDocument, rowIndex: number | undefined, column: UIColumn | undefined): any {
        // inputs & dropdowns always visible
        if (this.props.renderInputs && rowIndex !== undefined) {
            if (column?.columnControlType === ColumnControlType.UIDropdown) {
                return this._renderDropdown(item, rowIndex, column);
            }
            return this._renderTextInput(item, rowIndex, column);
        }

        // inputs visible only in "edit mode" (after cell click)
        const editedCell = this.state.editedCell;
        const itsThisRow = editedCell && editedCell.rowIndex === rowIndex;
        const itsThisCol = editedCell && editedCell.column?.key === column?.key;
        const isCellInEditMode = itsThisRow && itsThisCol;

        if (isCellInEditMode && rowIndex !== undefined) {
            if (column?.columnControlType === ColumnControlType.UIBooleanSelect) {
                return this._renderBooleanSelect(item, rowIndex, column);
            } else if (column?.columnControlType === ColumnControlType.UIDatePicker) {
                return this._renderDatePicker(item, rowIndex, column, column?.type === 'Date');
            } else {
                return this._renderTextInput(item, rowIndex, column);
            }
        }

        const onClick = (e: React.MouseEvent<HTMLElement, MouseEvent>): void => {
            e.stopPropagation();
            this._onCellClick(e, item, rowIndex || 0, column);
        };

        return (
            <span style={{ cursor: 'text', padding: 5 }} onClick={onClick}>
                {item[column?.fieldName || 0]}
            </span>
        );
    }

    /**
     * @returns {JSX.Element}
     */
    render(): JSX.Element {
        // get columns & items from props, so that detailsListProps does not contain them
        // because we want them to come from state, and be passed to component only once
        let { columns, items, checkboxVisibility, headerRenderer, selectionMode } = this.props;
        const { scrollablePaneProps, showRowNumbers, ...detailsListProps } = this.props;

        // get them from state if they exist
        if (this.state.columns) {
            columns = this.state.columns;
        }
        if (this.state.items) {
            items = this.state.items;
        }

        if (columns) {
            columns.forEach((col) => {
                col.onColumnClick = this._onColumnClick;
                if (col.editable === true) {
                    col.onRender = this._onCellRender;
                } else {
                    col.className = 'uneditable';
                }
                if (col.key === this.props.selectedColumnId) {
                    col.headerClassName = 'selected';
                }
            });
            columns = addRowNumbers(columns, showRowNumbers);
        }

        const styles: Partial<IDetailsListStyles> = getStylesForSelectedCell(this.state);
        if (typeof checkboxVisibility === 'undefined') {
            checkboxVisibility = CheckboxVisibility.hidden;
        }
        if (typeof selectionMode === 'undefined') {
            selectionMode = SelectionMode.single;
        }
        if (typeof headerRenderer === 'undefined') {
            headerRenderer = _onHeaderRender;
        }

        const focusZoneProps = {
            direction: FocusZoneDirection.vertical,
            shouldEnterInnerZone: (ev: React.KeyboardEvent<HTMLElement>): boolean => {
                return ev.key === 'ArrowRight';
            }
        };

        return (
            <ScrollablePane {...scrollablePaneProps} styles={{ stickyAbove: { zIndex: 2 } }}>
                <DetailsList
                    checkboxVisibility={checkboxVisibility}
                    componentRef={this.tableRef}
                    selection={this.selection}
                    selectionMode={selectionMode}
                    onRenderCheckbox={this._onRenderCheckbox}
                    onRenderDetailsHeader={headerRenderer}
                    onRenderField={this._onRenderField}
                    onRenderRow={this._onRenderRow}
                    onRenderItemColumn={this._onRenderItemColumn}
                    layoutMode={DetailsListLayoutMode.fixedColumns}
                    constrainMode={ConstrainMode.unconstrained}
                    focusZoneProps={focusZoneProps}
                    onActiveItemChanged={this._onCellActivation}
                    {...detailsListProps}
                    items={items}
                    columns={columns}
                    styles={styles}
                />
            </ScrollablePane>
        );
    }
}
