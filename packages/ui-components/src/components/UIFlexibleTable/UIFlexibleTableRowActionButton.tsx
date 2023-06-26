import React from 'react';
import type { UiIcons } from '..';
import { UIIconButton } from '..';
import { getRowActionButtonId } from './utils';

export interface UIFlexibleTableRowActionProps {
    actionName: string;
    className?: string;
    iconName: UiIcons;
    disabled?: boolean;
    rowNumber: number;
    tableId: string;
    title?: string;
    onClick?: () => void;
    onFocus?: () => void;
}

/**
 * UIFlexibleTableRowActionButton Component.
 *
 * @param {UIFlexibleTableRowActionProps} props
 * @returns {React.ReactElement}
 */
export function UIFlexibleTableRowActionButton(props: UIFlexibleTableRowActionProps): React.ReactElement {
    return (
        <UIIconButton
            id={getRowActionButtonId(props.tableId, props.rowNumber, props.actionName)}
            key={`table-row-${props.rowNumber}-actions-${props.actionName}`}
            className={`flexible-table-content-table-row-item-actions-${props.actionName}${
                props.className ? ' ' + props.className : ''
            }`}
            onClick={props.onClick}
            onFocus={props.onFocus}
            disabled={props.disabled}
            iconProps={{ iconName: props.iconName }}
            title={props.title}
        />
    );
}
