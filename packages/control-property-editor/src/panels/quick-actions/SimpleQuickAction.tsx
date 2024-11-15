import type { ReactElement } from 'react';
import React from 'react';
import { useDispatch, useSelector } from 'react-redux';

import { UILink } from '@sap-ux/ui-components';

import type { SimpleQuickAction } from '@sap-ux-private/control-property-editor-common';
import { executeQuickAction } from '@sap-ux-private/control-property-editor-common';

import type { RootState } from '../../store';

export interface SimpleQuickActionListItemProps {
    action: Readonly<SimpleQuickAction>;
}

/**
 * Component for rendering Simple Quick Action.
 *
 * @param props Component props.
 * @param props.action Simple Quick Action to render.
 * @returns ReactElement
 */
export function SimpleQuickActionListItem({ action }: Readonly<SimpleQuickActionListItemProps>): ReactElement {
    const dispatch = useDispatch();
    const isDisabled = useSelector<RootState, boolean>((state) => state.appMode === 'navigation');

    return (
        <div className={`quick-action-item`}>
            <UILink
                key={action.id}
                title={action.tooltip ?? action.title}
                underline={false}
                disabled={isDisabled || !action.enabled}
                onClick={() => {
                    dispatch(executeQuickAction({ kind: action.kind, id: action.id }));
                }}>
                <span className={`link-text`}>{action.title}</span>
            </UILink>
        </div>
    );
}
