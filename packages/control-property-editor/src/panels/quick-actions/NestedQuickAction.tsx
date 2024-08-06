import type { ReactElement } from 'react';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useDispatch } from 'react-redux';

import { UIActionButton, UIContextualMenuItem, UIDirectionalHint, UILink } from '@sap-ux/ui-components';

import type { NestedQuickAction, NestedQuickActionChild } from '@sap-ux-private/control-property-editor-common';
import { executeQuickAction } from '@sap-ux-private/control-property-editor-common';
import { IconName } from 'src/icons';

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

    const [expandedCallouts, setExpandedCallouts] = useState<number[]>([]);

    const buildMenuItems = function (children: NestedQuickActionChild[]): UIContextualMenuItem[] {
        return children.map((item, idx) => {
            const hasChildren = item?.children?.length > 1;
            return {
                key: `${idx}`,
                text: item.label,
                subMenuProps: hasChildren
                    ? {
                          submenuIconProps: {
                              iconName: IconName.chevronLeft
                          },
                          directionalHint: UIDirectionalHint.leftCenter,
                          items: buildMenuItems(item.children)
                      }
                    : undefined,
                onClick() {
                    dispatch(
                        executeQuickAction({
                            kind: action.kind,
                            type: action.type,
                            path: [...expandedCallouts.slice(1), idx].join('/')
                        })
                    );
                    setExpandedCallouts([]);
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
