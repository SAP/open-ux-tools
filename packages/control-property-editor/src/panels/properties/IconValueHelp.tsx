import type { UIColumn } from '@sap-ux/ui-components';
import { UIDialog, UIIconButton, UiIcons, UISearchBox, UITable, SelectionMode } from '@sap-ux/ui-components';
import type { CSSProperties, ReactElement } from 'react';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { IconDetails, PropertyType } from '@sap-ux-private/control-property-editor-common';

import './SapUiIcon.scss';
import { changeProperty } from '../../slice';
import { setCachedValue } from './propertyValuesCache';
import { InputType } from './types';
import { useDispatch } from 'react-redux';

export interface IconValueHelpProps {
    icons:
        | {
              name: string;
              content: string;
              fontFamily: string;
          }[]
        | [];
    value: string;
    controlId: string;
    controlName: string;
    propertyName: string;
    disabled: boolean;
    propertyType: PropertyType;
}

/**
 * React element for showing ui5 icon values.
 *
 * @param iconValueHelpProps IconValueHelpProps
 * @returns ReactElement
 */
export function IconValueHelp(iconValueHelpProps: IconValueHelpProps): ReactElement {
    const { icons, value, propertyName, controlId, disabled, controlName, propertyType } = iconValueHelpProps;
    const dispatch = useDispatch();
    const [newValue, setNewValue] = useState(value || '');
    const { t } = useTranslation();
    const [items, setItems] = useState(icons);
    const [isDialogVisible, setDialogVisibility] = useState(false);

    const onValueHelpButtonClick = (): void => {
        setDialogVisibility(true);
    };

    const onSelectionChange = (rows: number[]): void => {
        if (items && rows.length > 0) {
            setNewValue('sap-icon://' + items[rows[0]].name);
        }
    };

    const onFilterChange = (
        event?: React.ChangeEvent<HTMLInputElement> | undefined,
        filterValue?: string | undefined
    ): void => {
        if (filterValue && icons) {
            setItems(
                icons.filter((icon) => {
                    return icon.name.toLowerCase().includes(filterValue.toLowerCase());
                })
            );
        } else {
            setItems(icons);
        }
    };
    const onIconColumnRender = (item: IconDetails): ReactElement => (
        <IconColumn content={item.content} fontFamily={item.fontFamily} />
    );
    const onLabelColumnRender = (item: IconDetails): ReactElement => <LabelColumn name={item.name} />;

    const col1: UIColumn = {
        key: t('ICON'),
        name: t('ICON'),
        fieldName: t('ICON'),
        minWidth: 68,
        flexGrow: 1,
        isResizable: true,
        onRender: onIconColumnRender
    };
    const col2: UIColumn = {
        key: t('ICON_NAME'),
        name: t('ICON_NAME'),
        fieldName: t('ICON_NAME'),
        minWidth: 238,
        flexGrow: 4,
        isResizable: true,
        onRender: onLabelColumnRender
    };
    const columns: UIColumn[] = [col1, col2];
    const propertyNamePascalCase = propertyName[0].toUpperCase() + propertyName.substring(1);
    return (
        <>
            <UIIconButton
                id={`SelectIconFor${propertyNamePascalCase}`}
                className="valueHelp-button"
                title={t('SELECT_ICON')}
                iconProps={{ iconName: UiIcons.ValueHelp }}
                onClick={onValueHelpButtonClick}
                disabled={disabled}
            />
            <UIDialog
                hidden={!isDialogVisible}
                modalProps={{
                    className: 'icon-dialog'
                }}
                dialogContentProps={{
                    title: t('SELECT_ICON')
                }}
                closeButtonAriaLabel={t('CLOSE')}
                acceptButtonText={t('OK')}
                cancelButtonText={t('CANCEL')}
                onAccept={() => {
                    setDialogVisibility(false);
                    setItems(icons);
                    setCachedValue(controlId, propertyName, InputType.string, newValue);
                    const action = changeProperty({
                        changeType: 'propertyChange',
                        controlName,
                        controlId,
                        propertyName,
                        value: newValue,
                        propertyType
                    });
                    dispatch(action);
                }}
                onCancel={() => {
                    setDialogVisibility(false);
                    setItems(icons);
                }}>
                <div className="filter-icon-div" style={{ width: '100%', display: 'flex', alignItems: 'center' }}>
                    <UISearchBox
                        className="filter-icons"
                        autoFocus={false}
                        disableAnimation={false}
                        placeholder="Filter Icons"
                        onChange={onFilterChange}
                    />
                </div>
                <div className="icon-table-div" style={{ height: '100%', position: 'relative', marginTop: '10px' }}>
                    <UITable
                        className="icon-table space"
                        scrollablePaneProps={{
                            className: 'icon-table'
                        }}
                        selectionMode={SelectionMode.single}
                        dataSetKey={'datasetkey'}
                        items={items}
                        columns={columns}
                        onSelectionChange={onSelectionChange}
                        ariaLabelForSelectionColumn="Toggle selection"
                        ariaLabelForSelectAllCheckbox="Toggle selection for all items"
                        checkButtonAriaLabel="select row"
                        layoutMode={1}
                        isHeaderVisible={true}
                    />
                </div>
            </UIDialog>
        </>
    );
}
interface IconColumnProps {
    fontFamily: string;
    content: string;
}

/**
 * React element for showing ui5 icon column.
 *
 * @param props IconColumnProps
 * @returns ReactElement
 */
function IconColumn(props: IconColumnProps): React.JSX.Element {
    const { content, fontFamily } = props;
    const style: CSSProperties = {
        fontFamily: fontFamily,
        fontSize: '1rem',
        fontStyle: 'normal',
        display: 'inline-block',
        lineHeight: 0,
        verticalAlign: 'baseLine',
        textAlign: 'center',
        marginTop: 8
    };
    return <span className="sapUiIcon icon-span" data-sap-ui-icon-content={content} style={style}></span>;
}
interface LabelColumnProps {
    name: string;
}
/**
 * React element for showing ui5 label column.
 *
 * @param props { name: string; fontFamily: string }
 * @returns ReactElement
 */
function LabelColumn(props: LabelColumnProps): React.JSX.Element {
    const { name } = props;
    const style: CSSProperties = {
        fontSize: '13px',
        fontStyle: 'normal'
    };
    return <span style={style}>{name}</span>;
}
