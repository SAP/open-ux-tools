import React, { useRef, useState, useEffect } from 'react';
import type { IDropdownOption } from '@fluentui/react';
import type {
    CellRendererParams,
    CellRendererResult,
    TableRowCells,
    TableRowEventHandlerParameters,
    UIFlexibleTableColumnType,
    UIFlexibleTableRowType
} from '../src/components';
import {
    UICheckbox,
    UIDefaultButton,
    UIDropdown,
    UIFlexibleTable,
    UIFlexibleTableActionButton,
    UIFlexibleTableLayout,
    UIFlexibleTableRowActionButton,
    UiIcons,
    UILink,
    UITextInput,
    UIToggle,
    UIToggleSize
} from '../src/components';

import { arrayMove } from 'react-movable';

import { initIcons } from '../src/components/Icons';

initIcons();

export default { title: 'Tables/UIFlexibleTable' };
const tableIds = ['table1', 'table2'];

const columns: UIFlexibleTableColumnType[] = Array.from({ length: 10 }).map((item, index) => {
    const col: UIFlexibleTableColumnType = {
        key: `column${index + 1}`,
        title: `Column ${index + 1}`,
        tooltip: `Tooltip for column #${index + 1}`
    };
    return col;
});
columns.push({ key: 'preferred', title: 'Preferred', hidden: true });

interface TableCellDescriptor {
    type: 'input' | 'dropdown' | 'link';
    value: string;
}

type TableModel = { [column: string]: string }[]; // TODO: static row keys

const getNewModelRow = (rowIndex: number) => {
    const modelRow: { [column: string]: string } = {};
    columns.forEach((c, cIdx) => {
        modelRow[c.key] = cIdx < 5 ? `sample_${rowIndex}${cIdx}` : 'a';
    });
    return modelRow;
};

const rows: UIFlexibleTableRowType<TableCellDescriptor>[] = [];

const getRows = (
    model: TableModel,
    showSpecial: boolean,
    actionRow: number
): UIFlexibleTableRowType<TableCellDescriptor>[] => {
    const rows: UIFlexibleTableRowType<TableCellDescriptor>[] = model.map((item, rIdx) => {
        const cells: TableRowCells<TableCellDescriptor> = {};

        columns.forEach((c, cIdx) => {
            cells[c.key] = {
                type: cIdx < 5 ? 'input' : showSpecial && cIdx === 9 ? 'link' : 'dropdown',
                value: model[rIdx][c.key]
            };
        });
        const isPreferred = cells['preferred'].value === '1';

        return {
            key: rIdx.toFixed(0),
            title: `Row ${rIdx + 1}`,
            className: actionRow === rIdx || actionRow === 100 ? 'active-row' : isPreferred ? 'preferred-row' : '',
            cells,
            tooltip: `Tooltip for row #${rIdx + 1}`
        };
    });
    return rows;
};

function cellRenderer(
    params: CellRendererParams<TableCellDescriptor>,
    readonly: boolean,
    onChange: (value: string) => void,
    withSpan: boolean
): CellRendererResult {
    const value = params.value.value;
    const isSpannedCell = params.colIndex === 1 && params.rowIndex === 2 && withSpan;
    const column = columns[params.colIndex];
    switch (params.value.type) {
        case 'dropdown': {
            const options: IDropdownOption[] = ['a', 'b', 'c'].map((key) => ({
                key,
                text: `Option ${key.toUpperCase()}`
            }));
            return {
                title: isSpannedCell ? 'Custom Title for spanned cell' : undefined,
                isSpan: isSpannedCell,
                cellClassNames: isSpannedCell
                    ? 'spanned-cell'
                    : withSpan && params.rowIndex === 2 && !isSpannedCell
                    ? 'not-spanned-cell'
                    : undefined,
                content: (
                    <UIDropdown
                        options={options}
                        selectedKey={value}
                        disabled={readonly}
                        onChange={(event, option, index) => onChange(option?.key.toString() ?? '')}
                        title={column.tooltip}
                    />
                )
            };
        }
        case 'input': {
            return {
                title: isSpannedCell ? 'Custom Title for spanned cell' : undefined,
                isSpan: isSpannedCell,
                cellClassNames: [
                    isSpannedCell
                        ? 'spanned-cell'
                        : withSpan && params.rowIndex === 2 && !isSpannedCell
                        ? 'not-spanned-cell'
                        : ''
                ],
                content: (
                    <TextInputWrapper
                        value={value}
                        readonly={readonly}
                        onChange={(value) => onChange(value)}
                        title={column.tooltip}
                    />
                )
            };
        }
        default: {
            return {
                content: (
                    <UILink href="" title="Tooltip for navigation">
                        Link
                    </UILink>
                )
            };
        }
    }
}

function TextInputWrapper(props: {
    readonly?: boolean;
    onChange: (value: string) => void;
    value: string;
    title?: string;
}) {
    const [value, setValue] = useState('');

    useEffect(() => {
        setValue(props.value);
    }, [props.value]);

    const onChange = (v: string) => {
        setValue(v);
    };

    return (
        <UITextInput
            value={value}
            readOnly={props.readonly}
            onChange={(event, value) => onChange(value || '')}
            onBlur={() => {
                if (props.value !== value) {
                    setTimeout(() => {
                        props.onChange(value);
                    }, 0);
                }
            }}
            title={props.title}
        />
    );
}

function addRowToModel(model: TableModel): void {
    const modelRow = getNewModelRow(model.length);
    model.push(modelRow);
}

// ----------------------- Inline Flex layout --------------
const css1 = `
.flexible-table {
    font-size: 13px;
}

body .flexible-table-content-table-row.dragged {
    font-size: 13px;
}

.flexible-table-content-table-row-item-actions, .flexible-table-content-table-title-row-item-actions {
    min-width: 130px !important;
}

.flexible-table-content-table-row.active-row {
    background: #D0FFD0;
}

.table-column.fixed {
    width: 100px;
}

.table-column.column-0 {
    background: #FFD0B0;
}

.table-column.column-5 {
    background: #D0B0FF;
}

.in-row .spanned-cell {
    flex: 9;
    
}
.in-row .not-spanned-cell {
    flex: 1;
}
`;

export const InlineFlexTable = (): JSX.Element => {
    const [actualRows, setActualRows] = useState(rows);
    const [model, setModel] = useState<TableModel>([]);
    const [loading, setLoading] = useState(false);
    const [isReorderable, setIsReorderable] = useState(true);
    const [showTitleRow, setShowTitleRow] = useState(true);
    const [showRowHeaders, setShowRowHeaders] = useState(false);
    const [showCellTitles, setShowCellTitles] = useState(false);
    const [isCompact, setIsCompact] = useState(false);
    const [noRowBackground, setNoRowBackground] = useState(false);
    const [isAddDisabled, setIsAddDisabled] = useState(false);
    const [isDeleteDisabled, setIsDeleteDisabled] = useState(false);
    const [isReadonly, setIsReadonly] = useState(false);
    const [showIndex, setShowIndex] = useState(true);
    const [showSpecialContent, setShowSpecialContent] = useState(false);
    const [showHighlight, setShowHighlight] = useState(false);
    const [showSpanned, setShowSpanned] = useState(false);
    const [actionRow, setActionRow] = useState(-1);
    const [isFixedMaxWidth, setIsFixedMaxWidth] = useState(false);
    const [isLockVertically, setIsLockVertically] = useState(false);
    const [isReverseBackground, setIsReverseBackground] = useState(false);
    const [isRowReorderingDisabled, setIsRowReorderingDisabled] = useState(false);

    // Prevent cell editor click propagation
    const cellRefs = useRef<{ [key: string]: React.RefObject<HTMLDivElement> }>({});
    const stopCellEventBubbling = (e: MouseEvent) => {
        e.stopPropagation();
    };

    const setRows = (mod: TableModel) => {
        setActualRows(getRows(mod, showSpecialContent, actionRow));
    };

    useEffect(() => {
        for (const key in cellRefs.current) {
            const ref = cellRefs.current[key];
            if (ref.current) {
                ref.current.removeEventListener('mousedown', stopCellEventBubbling);
                ref.current.addEventListener('mousedown', stopCellEventBubbling);
            }
        }
    });

    useEffect(() => {
        setRows(model);
    }, [showSpecialContent, actionRow]);

    useEffect(() => {
        const model = Array.from({ length: 3 }).map((key, idx) => getNewModelRow(idx));
        setModel(model);
        setRows(model);
    }, []);

    const onAddRow = () => {
        addRowToModel(model);
        setModel(model);
        setRows(model);
        return { scrollToRow: model.length - 1 };
    };

    const onDeleteRow = (params: TableRowEventHandlerParameters<TableCellDescriptor>) => {
        model.splice(params.rowIndex, 1);
        setModel(model);
        setRows(model);
    };

    const onReorder = (params: {
        oldIndex: number;
        newIndex: number;
    }): {
        isDropDisabled: boolean;
    } => {
        const isDropDisabled = isRowReorderingDisabled && params.oldIndex === 0 && params.newIndex > 1;
        if (!isDropDisabled) {
            const model2 = arrayMove(model, params.oldIndex, params.newIndex);
            setModel(model2);
            setRows(model2);
        }
        return {
            isDropDisabled
        };
    };

    const option = (label: string, value: boolean, setter: (value: React.SetStateAction<boolean>) => void) => (
        <UICheckbox
            label={label}
            checked={value}
            onChange={() => {
                setter(!value);
            }}
        />
    );

    const onRenderCell = (params: CellRendererParams<TableCellDescriptor>): CellRendererResult => {
        const refId = `cell-${params.rowIndex}-${params.colIndex}`;
        if (!cellRefs.current[refId]) {
            cellRefs.current[refId] = React.createRef();
        }

        const changeCallback = (value: any) => {
            model[params.rowIndex][params.colKey] = value;
            setModel(model);
            setRows(model);
        };
        const cell = cellRenderer(params, isReadonly, changeCallback, showSpanned);
        return { ...cell, content: <div ref={cellRefs.current[refId]}>{cell.content}</div> };
    };

    const rowSpecial = (params: TableRowEventHandlerParameters<TableCellDescriptor>): React.ReactNode => {
        if (params.rowIndex === model.length - 1) {
            return <div style={{ padding: '0 5px', verticalAlign: 'center' }}>Special row content</div>;
        }
    };

    const onActionClick = (rowIndex: number) => {
        setActionRow(rowIndex);
        new Promise((done) => {
            setTimeout(() => done(true), 2000);
        }).then(() => {
            setActionRow(-1);
        });
    };

    const onRenderActions: (params: TableRowEventHandlerParameters<TableCellDescriptor>) => React.ReactElement[] = (
        params
    ) => {
        return [
            <UIFlexibleTableRowActionButton
                key={`goto-code-row-${params.rowIndex}`}
                actionName="GotoCode"
                tableId={tableIds[0]}
                iconName={UiIcons.CodeSnippet}
                rowNumber={params.rowIndex}
                onClick={() => onActionClick(params.rowIndex)}
                title="Navigation demo"
            />
        ];
    };

    const onRenderSecondaryTableActions: (params: { readonly: boolean }) => React.ReactElement[] = (params) => {
        return [
            <UIFlexibleTableActionButton
                key={`goto-code-row-${0}`}
                actionName="GotoCode"
                tableId={tableIds[0]}
                iconName={UiIcons.CodeSnippet}
                onClick={() => onActionClick(100)}
                title="Navigation demo"
            />
        ];
    };

    const onRenderPrimatyTableActions: (params: { readonly: boolean }) => React.ReactElement[] = (params) => {
        return [
            <UIDefaultButton
                key="1"
                iconProps={{ iconName: 'Delete' }}
                className="flexible-table-btn-clear"
                disabled={loading || params.readonly}
                onClick={() => {
                    setModel([]);
                    setActualRows([]);
                }}>
                Clear table
            </UIDefaultButton>
        ];
    };

    return (
        <div>
            <h3>In-line layout</h3>
            <div style={{ display: 'flex', flexDirection: 'row', flexWrap: 'wrap', gap: '20px', maxWidth: '1200px' }}>
                {option('Vertical layout', isCompact, setIsCompact)}
                {option('Show titles', showTitleRow, setShowTitleRow)}
                {option('Show titles in cells', showCellTitles, setShowCellTitles)}
                {option('Show row headers', showRowHeaders, setShowRowHeaders)}
                {option('Show Index', showIndex, setShowIndex)}
                {option('Show custom content', showSpecialContent, setShowSpecialContent)}
                {option('Span cells', showSpanned, setShowSpanned)}
                {option('Reorder enabled', isReorderable, setIsReorderable)}
                {option('Reorder restrictions', isRowReorderingDisabled, setIsRowReorderingDisabled)}
                {option('Disable Adding', isAddDisabled, setIsAddDisabled)}
                {option('Disable Deletion', isDeleteDisabled, setIsDeleteDisabled)}
                {option('Readonly', isReadonly, setIsReadonly)}
                {option('No row background', noRowBackground, setNoRowBackground)}
                {option('Loading data', loading, setLoading)}
                {option('Column highlight', showHighlight, setShowHighlight)}
                {option('Is fixed max width', isFixedMaxWidth, setIsFixedMaxWidth)}
                {option('Lock vertically', isLockVertically, setIsLockVertically)}
                {option('Reverse background', isReverseBackground, setIsReverseBackground)}
            </div>
            <hr></hr>
            <div>
                <style>{css1}</style>
                <div style={{ maxWidth: isCompact ? '500px' : '1300px' }}>
                    <UIFlexibleTable
                        addRowButton={{
                            label: 'Add row',
                            title: isReadonly ? 'Disabled due to read only mode' : '',
                            onClick: onAddRow
                        }}
                        columns={columns.map((c, index) => ({
                            ...c,
                            className: `table-column column-${showHighlight ? index : ''}${
                                showSpecialContent ? 'fixed' : ''
                            }`
                        }))}
                        id={tableIds[0]}
                        layout={UIFlexibleTableLayout.InlineFlex}
                        onRenderCell={onRenderCell}
                        rows={actualRows}
                        inRowLayoutMinWidth={1000}
                        onDeleteRow={onDeleteRow}
                        showColumnTitles={showTitleRow}
                        showColumnTitlesInCells={showCellTitles}
                        isContentLoading={loading}
                        onTableReorder={isReorderable ? onReorder : undefined}
                        noRowBackground={noRowBackground}
                        isAddItemDisabled={isAddDisabled}
                        showIndexColumn={showIndex}
                        readonly={isReadonly}
                        onRenderDeleteAction={(params) => ({
                            isDeleteDisabled: isDeleteDisabled && params.rowIndex === 0,
                            tooltip:
                                isDeleteDisabled && params.rowIndex === 0
                                    ? 'Disabled for demo purposes'
                                    : 'Click to delete the row'
                        })}
                        onRenderActions={onRenderActions}
                        onRenderRowDataContent={showSpecialContent ? rowSpecial : undefined}
                        onRenderReorderActions={(params) => {
                            return isRowReorderingDisabled
                                ? {
                                      up: {
                                          disabled: params.rowIndex === 1,
                                          tooltip:
                                              params.rowIndex === 1 ? 'Move up disabled for demo purposes' : undefined
                                      },
                                      down: {
                                          disabled: params.rowIndex === 1,
                                          tooltip:
                                              params.rowIndex === 1 ? 'Move down disabled for demo purposes' : undefined
                                      }
                                  }
                                : {};
                        }}
                        onBeforeTableRender={
                            isRowReorderingDisabled
                                ? (params) => {
                                      return {
                                          rows: params.rows.map((row, index) => ({ ...row, disabled: index === 1 }))
                                      };
                                  }
                                : undefined
                        }
                        onRenderRowContainer={
                            isRowReorderingDisabled
                                ? (params) => {
                                      return {
                                          isDropWarning: !params.isDragged && !!params.rowIndex && params.rowIndex > 1
                                      };
                                  }
                                : undefined
                        }
                        maxScrollableContentHeight={isCompact ? 700 : 220}
                        showRowTitles={showRowHeaders}
                        maxWidth={isFixedMaxWidth ? 800 : undefined}
                        lockVertically={isLockVertically}
                        reverseBackground={isReverseBackground}
                        onRenderPrimaryTableActions={onRenderPrimatyTableActions}
                        onRenderSecondaryTableActions={onRenderSecondaryTableActions}
                        noDataText={'No data'}
                    />
                </div>
            </div>
        </div>
    );
};

// ----------------------- Wrapping layout --------------

const css2 = `

.flexible-table {
    font-size: 13px;
}

body .flexible-table-content-table-row.dragged {
    font-size: 13px;
}

.flexible-table-content-table-row-item-actions, .flexible-table-content-table-title-row-item-actions {
    min-width: 130px !important;
}

.flexible-table-content-table-row.preferred-row {
    background: #FFD0D0;
}

.flexible-table-content-table-row.active-row {
    background: #D0FFD0;
}

.flexible-table-content-table-row-wrapper.wrapping-layout .flexible-table-content-table-row-item-data-cells-wrapper {
    width: 120px !important;
}

.table-column.column-0 {
    background: #FFD0B0;
}

.table-column.column-5 {
    background: #D0B0FF;
}

.flexible-table-content-table-row-wrapper.wrapping-layout .flexible-table-content-table-row-item-data-cells-wrapper.spanned-cell {
    width: 240px !important;
}
`;

export const WrappingTable = (): JSX.Element => {
    const [actualRows, setActualRows] = useState(rows);
    const [model, setModel] = useState<TableModel>([]);
    const [loading, setLoading] = useState(false);
    const [isReorderable, setIsReorderable] = useState(true);
    const [showTitleRow, setShowTitleRow] = useState(true);
    const [isCompact, setIsCompact] = useState(false);
    const [noRowBackground, setNoRowBackground] = useState(false);
    const [isAddDisabled, setIsAddDisabled] = useState(false);
    const [isDeleteDisabled, setIsDeleteDisabled] = useState(false);
    const [isReadonly, setIsReadonly] = useState(false);
    const [showIndex, setShowIndex] = useState(false);
    const [showSpecialContent, setShowSpecialContent] = useState(false);
    const [showHighlight, setShowHighlight] = useState(false);
    const [showSpanned, setShowSpanned] = useState(false);
    const [actionRow, setActionRow] = useState(-1);
    const [isLockVertically, setIsLockVertically] = useState(false);
    const [isReverseBackground, setIsReverseBackground] = useState(false);
    const [isRowReorderingDisabled, setIsRowReorderingDisabled] = useState(false);

    // Prevent cell editor click propagation
    const cellRefs = useRef<{ [key: string]: React.RefObject<HTMLDivElement> }>({});
    const stopCellEventBubbling = (e: MouseEvent) => {
        e.stopPropagation();
    };

    const setRows = (mod: TableModel) => {
        setActualRows(getRows(mod, showSpecialContent, actionRow));
    };

    useEffect(() => {
        for (const key in cellRefs.current) {
            const ref = cellRefs.current[key];
            if (ref.current) {
                ref.current.removeEventListener('mousedown', stopCellEventBubbling);
                ref.current.addEventListener('mousedown', stopCellEventBubbling);
            }
        }
    });

    useEffect(() => {
        setRows(model);
    }, [showSpecialContent, actionRow]);

    useEffect(() => {
        const model = Array.from({ length: 3 }).map((key, idx) => getNewModelRow(idx));
        setModel(model);
        setRows(model);
    }, []);

    const onAddRow = () => {
        addRowToModel(model);
        setModel(model);
        setRows(model);
        return { scrollToRow: model.length - 1 };
    };

    const onDeleteRow = (params: TableRowEventHandlerParameters<TableCellDescriptor>) => {
        model.splice(params.rowIndex, 1);
        setModel(model);
        setRows(model);
    };

    const onReorder = (params: {
        oldIndex: number;
        newIndex: number;
    }): {
        isDropDisabled: boolean;
    } => {
        const isDropDisabled = isRowReorderingDisabled && params.oldIndex === 0 && params.newIndex > 1;
        if (!isDropDisabled) {
            const model2 = arrayMove(model, params.oldIndex, params.newIndex);
            setModel(model2);
            setRows(model2);
        }
        return {
            isDropDisabled
        };
    };;

    const option = (label: string, value: boolean, setter: (value: React.SetStateAction<boolean>) => void) => (
        <UICheckbox
            label={label}
            checked={value}
            onChange={() => {
                setter(!value);
            }}
        />
    );

    const onRenderCell = (params: CellRendererParams<TableCellDescriptor>): CellRendererResult => {
        const refId = `cell-${params.rowIndex}-${params.colIndex}`;
        if (!cellRefs.current[refId]) {
            cellRefs.current[refId] = React.createRef();
        }

        const changeCallback = (value: any) => {
            model[params.rowIndex][params.colKey] = value;
            setModel(model);
            setRows(model);
        };
        const cell = cellRenderer(params, isReadonly, changeCallback, showSpanned);
        return { ...cell, content: <div ref={cellRefs.current[refId]}>{cell.content}</div> };
    };

    const rowSpecial = (params: TableRowEventHandlerParameters<TableCellDescriptor>): React.ReactNode => {
        if (params.rowIndex === model.length - 1) {
            return <div style={{ padding: '0 5px', verticalAlign: 'center' }}>Special row content</div>;
        }
    };

    const onActionClick = (rowIndex: number) => {
        setActionRow(rowIndex);
        new Promise((done) => {
            setTimeout(() => done(true), 2000);
        }).then(() => {
            setActionRow(-1);
        });
    };

    const onRenderActions = (params: TableRowEventHandlerParameters<TableCellDescriptor>): React.ReactElement[] => {
        return [
            <UIToggle
                key="1"
                label={'Preferred'}
                checked={params.cells['preferred'].value === '1'}
                onChange={(event, checked) => {
                    model[params.rowIndex]['preferred'] = checked ? '1' : '0';
                    setModel(model);
                    setRows(model);
                }}
                inlineLabel={true}
                inlineLabelLeft={true}
                labelFlexGrow={true}
                size={UIToggleSize.Small}
                disabled={isReadonly}
            />,
            <UIFlexibleTableRowActionButton
                key={`goto-code-row-${params.rowIndex}`}
                actionName="GotoCode"
                tableId={tableIds[1]}
                iconName={UiIcons.CodeSnippet}
                rowNumber={params.rowIndex}
                onClick={() => onActionClick(params.rowIndex)}
                title="Navigation demo"
            />
        ];
    };

    const onRenderSecondaryTableActions: (params: { readonly: boolean }) => React.ReactElement[] = (params) => {
        return [
            <UIFlexibleTableActionButton
                key={`goto-code-row-${0}`}
                actionName="GotoCode"
                tableId={tableIds[0]}
                iconName={UiIcons.CodeSnippet}
                onClick={() => onActionClick(100)}
                title="Navigation demo"
            />
        ];
    };

    const onRenderPrimatyTableActions: (params: { readonly: boolean }) => React.ReactElement[] = (params) => {
        return [
            <UIDefaultButton
                key="1"
                iconProps={{ iconName: 'Delete' }}
                className="flexible-table-btn-clear"
                disabled={loading || params.readonly}
                onClick={() => {
                    setModel([]);
                    setActualRows([]);
                }}>
                Clear table
            </UIDefaultButton>
        ];
    };

    return (
        <div>
            <hr></hr>
            <h3>Wrapping layout</h3>
            <div style={{ display: 'flex', flexDirection: 'row', flexWrap: 'wrap', gap: '20px', maxWidth: '1200px' }}>
                {option('Compact size', isCompact, setIsCompact)}
                {option('Show titles', showTitleRow, setShowTitleRow)}
                {option('Show Index', showIndex, setShowIndex)}
                {option('Show custom content', showSpecialContent, setShowSpecialContent)}
                {option('Span cells', showSpanned, setShowSpanned)}
                {option('Reorder enabled', isReorderable, setIsReorderable)}
                {option('Reorder restrictions', isRowReorderingDisabled, setIsRowReorderingDisabled)}
                {option('Disable Adding', isAddDisabled, setIsAddDisabled)}
                {option('Disable Deletion', isDeleteDisabled, setIsDeleteDisabled)}
                {option('Readonly', isReadonly, setIsReadonly)}
                {option('No row background', noRowBackground, setNoRowBackground)}
                {option('Loading data', loading, setLoading)}
                {option('Column highlight', showHighlight, setShowHighlight)}
                {option('Lock vertically', isLockVertically, setIsLockVertically)}
                {option('Reverse background', isReverseBackground, setIsReverseBackground)}
            </div>
            <hr></hr>
            <div>
                <style>{css2}</style>
                <div style={{ maxWidth: isCompact ? '500px' : 'fit-content' }}>
                    <UIFlexibleTable
                        addRowButton={{
                            label: 'Add row',
                            title: isReadonly ? 'Disabled due to read only mode' : '',
                            onClick: onAddRow
                        }}
                        columns={columns.map((c, index) => ({
                            ...c,
                            className: `table-column column-${showHighlight ? index : ''}`
                        }))}
                        id={tableIds[1]}
                        layout={UIFlexibleTableLayout.Wrapping}
                        onRenderCell={onRenderCell}
                        rows={actualRows}
                        onDeleteRow={onDeleteRow}
                        showColumnTitles={showTitleRow}
                        isContentLoading={loading}
                        onTableReorder={isReorderable ? onReorder : undefined}
                        noRowBackground={noRowBackground}
                        isAddItemDisabled={isAddDisabled}
                        showIndexColumn={showIndex}
                        readonly={isReadonly}
                        onRenderDeleteAction={(params) => ({
                            isDeleteDisabled: isDeleteDisabled && params.rowIndex === 0
                        })}
                        onRenderReorderActions={(params) => {
                            return isRowReorderingDisabled
                                ? {
                                      up: {
                                          disabled: params.rowIndex === 1,
                                          tooltip:
                                              params.rowIndex === 1 ? 'Move up disabled for demo purposes' : undefined
                                      },
                                      down: {
                                          disabled: params.rowIndex === 1,
                                          tooltip:
                                              params.rowIndex === 1 ? 'Move down disabled for demo purposes' : undefined
                                      }
                                  }
                                : {};
                        }}
                        onBeforeTableRender={
                            isRowReorderingDisabled
                                ? (params) => {
                                      return {
                                          rows: params.rows.map((row, index) => ({ ...row, disabled: index === 1 }))
                                      };
                                  }
                                : undefined
                        }
                        onRenderRowContainer={
                            isRowReorderingDisabled
                                ? (params) => {
                                      return {
                                          isDropWarning: !params.isDragged && !!params.rowIndex && params.rowIndex > 1
                                      };
                                  }
                                : undefined
                        }
                        onRenderRowDataContent={showSpecialContent ? rowSpecial : undefined}
                        onRenderActions={onRenderActions}
                        maxScrollableContentHeight={isCompact ? 700 : 400}
                        lockVertically={isLockVertically}
                        reverseBackground={isReverseBackground}
                        onRenderPrimaryTableActions={onRenderPrimatyTableActions}
                        onRenderSecondaryTableActions={onRenderSecondaryTableActions}
                    />
                </div>
            </div>
        </div>
    );
};
