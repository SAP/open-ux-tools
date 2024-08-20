import type { ReactElement } from 'react';
import React, { useState } from 'react';
import { useDispatch } from 'react-redux';

import type { UIContextualMenuItem } from '@sap-ux/ui-components';
import { UIDirectionalHint, UIIcon, UILink, UIContextualMenu, UIContextualMenuLayoutType } from '@sap-ux/ui-components';

import type { NestedQuickAction, NestedQuickActionChild } from '@sap-ux-private/control-property-editor-common';
import { executeQuickAction } from '@sap-ux-private/control-property-editor-common';
import { IconName } from '../../icons';

export interface NestedQuickActionListItemProps {
    action: Readonly<NestedQuickAction>;
    /**
     *  Action line item index.
     */
    actionIndex: number;
}

/**
 * Component for rendering Simple Quick Action.
 *
 * @param props Component props.
 * @returns ReactElement
 */
export function NestedQuickActionListItem(props: Readonly<NestedQuickActionListItemProps>): ReactElement {
    const { action, actionIndex } = props;
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
        return children.map((child, index) => {
            const hasChildren = child?.children?.length > 1;
            const value = child?.children?.length === 1 ? `${child.label}-${child.children[0].label}` : child.label;
            return {
                key: `${value}-${index}`,
                text: value,
                title: value,
                subMenuProps: hasChildren
                    ? {
                          directionalHint: UIDirectionalHint.leftTopEdge,
                          items: buildMenuItems(child.children, [...nestedLevel, index])
                      }
                    : undefined,
                onClick(): void {
                    dispatch(
                        executeQuickAction({
                            kind: action.kind,
                            path: nestedLevel.length ? `${nestedLevel.join('/')}/${index}` : index.toString(),
                            id: action.id
                        })
                    );
                }
            };
        });
    };

    return (
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
                            setTarget(document.getElementById(`quick-action-children-button${actionIndex}`));
                        }}>
                        <span className={`link-text`}>{action.title}</span>
                        <UIIcon
                            id={`quick-action-children-button${actionIndex}`}
                            iconName={IconName.dropdown}
                            color="var()"
                            title={action.title}
                            style={{ verticalAlign: 'middle' }}
                            onClick={(): void => {
                                setShowContextualMenu(true);
                                setTarget(document.getElementById(`quick-action-children-button${actionIndex}`));
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
    );
}
