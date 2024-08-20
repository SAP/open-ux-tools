import type { ReactElement } from 'react';
import React, { useState } from 'react';
import { useDispatch } from 'react-redux';
import { useTranslation } from 'react-i18next';

import type { UIContextualMenuItem } from '@sap-ux/ui-components';
import { UIDirectionalHint, UIIcon, UILink, UIContextualMenu, UIContextualMenuLayoutType } from '@sap-ux/ui-components';

import type { NestedQuickAction, NestedQuickActionChild } from '@sap-ux-private/control-property-editor-common';
import { executeQuickAction } from '@sap-ux-private/control-property-editor-common';
import { IconName } from '../../icons';

export interface NestedQuickActionListItemProps {
    action: Readonly<NestedQuickAction>;
    actionIdx: number; // action lineitem index
}

/**
 * Component for rendering Simple Quick Action.
 *
 * @param props Component props.
 * @param props.action Nested Quick Action to render.
 * @returns ReactElement
 */
export function NestedQuickActionListItem({ action, actionIdx }: NestedQuickActionListItemProps): ReactElement {
    const { t } = useTranslation();
    const dispatch = useDispatch();
    const [showContextualMenu, setShowContextualMenu] = useState(false);
    const [target, setTarget] = useState<(EventTarget & (HTMLAnchorElement | HTMLElement | HTMLButtonElement)) | null>(
        null
    );

    /**
     *
     * @param children Node children.
     * @param nestedLevel Nested Level.
     * @returns ReactElement
     */
    const buildMenuItems = function (
        children: NestedQuickActionChild[],
        nestedLevel: number[] = []
    ): UIContextualMenuItem[] {
        return children.map((child, idx) => {
            const hasChildren = child?.children?.length > 1;
            const value = child?.children?.length === 1 ? `${child.label}-${child.children[0].label}` : child.label;
            return {
                key: `${value}-${idx}`,
                text: value,
                title: value,
                subMenuProps: hasChildren
                    ? {
                          directionalHint: UIDirectionalHint.leftTopEdge,
                          items: buildMenuItems(child.children, [...nestedLevel, idx])
                      }
                    : undefined,
                onClick() {
                    dispatch(
                        executeQuickAction({
                            kind: action.kind,
                            path: `${nestedLevel.length ? `${nestedLevel.join('/')}/${idx}` : idx}`,
                            id: action.id
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
                    <>
                        <UILink
                            underline={false}
                            title={`${action.title} - ${action.children[0].label}`}
                            onClick={(): void => {
                                dispatch(
                                    executeQuickAction({
                                        kind: action.kind,
                                        id: action.id,
                                        path: [0].join('/')
                                    })
                                );
                            }}>
                            <span className={`link-text`}>{`${action.title} - ${action.children[0].label}`}</span>
                        </UILink>
                    </>
                )}
                {action.children.length > 1 && (
                    <>
                        <UILink
                            title={action.title}
                            underline={false}
                            onClick={() => {
                                setShowContextualMenu(true);
                                setTarget(document.getElementById(`quick-action-children-button${actionIdx}`));
                            }}>
                            <span className={`link-text`}>{action.title}</span>
                            <UIIcon
                                id={`quick-action-children-button${actionIdx}`}
                                iconName={IconName.dropdown}
                                color="var()"
                                title={action.title}
                                style={{ verticalAlign: 'middle' }}
                                onClick={(): void => {
                                    setShowContextualMenu(true);
                                    setTarget(document.getElementById(`quick-action-children-button${actionIdx}`));
                                }}
                            />
                        </UILink>

                        {showContextualMenu && (
                            <UIContextualMenu
                                layoutType={UIContextualMenuLayoutType.ContextualMenu}
                                showSubmenuBeneath={true}
                                target={target}
                                isBeakVisible={true}
                                items={buildMenuItems(action.children)}
                                directionalHint={UIDirectionalHint.bottomRightEdge}
                                onDismiss={() => setShowContextualMenu(false)}
                                iconToLeft={true}
                            />
                        )}
                    </>
                )}
            </div>
        </>
    );
}
