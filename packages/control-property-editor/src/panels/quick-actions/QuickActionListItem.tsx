import type { ReactElement } from 'react';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useDispatch, useSelector } from 'react-redux';

import { UIActionButton, UIDirectionalHint, UIIcon, UiIcons } from '@sap-ux/ui-components';
import { executeQuickAction, type QuickAction } from '@sap-ux-private/control-property-editor-common';

import type { RootState } from '../../store';

/**
 * React element for all properties including id & type and property editors.
 *
 * @returns ReactElement
 */
export function QuickActionListItem(quickAction: Readonly<QuickAction>): ReactElement {
    const { t } = useTranslation();
    const quickActions = useSelector<RootState, QuickAction[]>((state) => state.quickActions);
    const dispatch = useDispatch();
    console.log(quickActions);
    return (
        <>
            <div className={`quick-action-item`}>
                {(quickAction.children || [])?.length === 0 && (
                    <UIActionButton
                        onClick={() => {
                            dispatch(executeQuickAction(quickAction));
                        }}>
                        {quickAction.title}
                    </UIActionButton>
                )}
                {(quickAction.children || [])?.length > 1 && (
                    <UIActionButton
                        menuProps={{
                            isBeakVisible: true,
                            directionalHint: UIDirectionalHint.bottomRightEdge,
                            directionalHintFixed: false,
                            items: (quickAction.children || [])?.map((child, index) => {
                                return {
                                    key: `${index}`,
                                    text: child,
                                    onClick: () => {
                                        dispatch(executeQuickAction({ ...quickAction, index }));
                                    }
                                };
                            })
                        }}>
                        {quickAction.title}
                    </UIActionButton>
                )}
                <UIIcon iconName={UiIcons.Info} ></UIIcon>
            </div>
        </>
    );
}
