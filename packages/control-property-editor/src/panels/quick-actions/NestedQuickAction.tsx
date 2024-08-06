import type { ReactElement } from 'react';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useDispatch } from 'react-redux';

import {
    UIActionButton,
    UIContextualMenuItem,
    UIDirectionalHint,
    UiIcons
} from '@sap-ux/ui-components';

import type { NestedQuickAction, NestedQuickActionChild } from '@sap-ux-private/control-property-editor-common';
import { executeQuickAction } from '@sap-ux-private/control-property-editor-common';

export interface NestedQuickActionListItemProps {
    action: Readonly<NestedQuickAction>;
}

/**
 * Component for rendering Simple Quick Action.
 *
 * @param props Component props.
 * @param props.action Nested Quick Action to render.
 * @returns ReactElement
 */
export function NestedQuickActionListItem({ action }: NestedQuickActionListItemProps): ReactElement {
    const { t } = useTranslation();
    const dispatch = useDispatch();

    const buildMenuItems = function (
        children: NestedQuickActionChild[],
        childIdx: number[] = []
    ): UIContextualMenuItem[] {
        return children.map((item, idx) => {
            const hasChildren = item?.children?.length > 1;
            return {
                key: `${idx}`,
                className: hasChildren ? 'submenu-icon' : '',
                text: item.label,
                submenuIconProps: hasChildren
                    ? {
                          iconName: UiIcons.ArrowUp // css class overrides Icons.chevronLeft
                      }
                    : undefined,
                subMenuProps: hasChildren
                    ? {
                          directionalHint: UIDirectionalHint.leftCenter,
                          items: buildMenuItems(item.children, [...childIdx, idx])
                      }
                    : undefined,
                onClick() {
                    dispatch(
                        executeQuickAction({
                            kind: action.kind,
                            type: action.type,
                            path: `${childIdx.length ? `${childIdx.join('/')}/${idx}` : idx}`
                        })
                    );
                }
            };
        });
    };

    return (
        <>
            <div className={`quick-action-item`}>
                {action.children.length === 1 && (
                    <UIActionButton
                        onClick={() => {
                            dispatch(
                                executeQuickAction({
                                    kind: action.kind,
                                    type: action.type,
                                    path: [0].join('/')
                                })
                            );
                        }}>
                        {`${action.title} - ${action.children[0].label}`}
                    </UIActionButton>
                )}
                {action.children.length > 1 && (
                    <UIActionButton
                        menuProps={{
                            isBeakVisible: true,
                            directionalHint: UIDirectionalHint.bottomCenter,
                            directionalHintFixed: false,
                            items: buildMenuItems(action.children)
                        }}>
                        {action.title}
                    </UIActionButton>
                )}
            </div>
        </>
    );
}
