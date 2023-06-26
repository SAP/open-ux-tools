import React from 'react';
import { UIIconButton } from '..';
import type { UiIcons } from '..';
import { getTableActionButtonId } from './utils';

export interface UIFlexibleTableActionProps {
    actionName: string;
    className?: string;
    iconName: UiIcons;
    disabled?: boolean;
    tableId: string;
    title?: string;
    onClick?: () => void;
    onFocus?: () => void;
}

/**
 * UIFlexibleTableActionButton component.
 *
 * @exports
 * @param {UIFlexibleTableActionProps} props
 * @returns { React.ReactElement}
 */
export function UIFlexibleTableActionButton(props: UIFlexibleTableActionProps): React.ReactElement {
    return (
        <UIIconButton
            id={getTableActionButtonId(props.tableId, props.actionName)}
            className={`flexible-table-actions-${props.actionName}${props.className ? ' ' + props.className : ''}`}
            onClick={props.onClick}
            onFocus={props.onFocus}
            disabled={props.disabled}
            iconProps={{ iconName: props.iconName }}
            title={props.title}
        />
    );
}
