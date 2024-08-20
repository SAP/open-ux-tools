import type { ReactElement } from 'react';
import React, { useState } from 'react';
import { useDispatch } from 'react-redux';
import { useTranslation } from 'react-i18next';

import type { UIContextualMenuItem } from '@sap-ux/ui-components';
import { UIDirectionalHint, UIIcon, UILink, UIContextualMenu } from '@sap-ux/ui-components';

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
        return children.map((child, index) => {
            const hasChildren = child?.children?.length > 1;
            return {
                key: `${child.label}-${index}`,
                text: child.label,
                subMenuProps: hasChildren
                    ? {
                          directionalHint: UIDirectionalHint.leftTopEdge,
                          items: buildMenuItems(child.children, [...nestedLevel, index])
                      }
                    : undefined,
                onClick() {
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
                        onClick={(): void => {
                            dispatch(
                                executeQuickAction({
                                    kind: action.kind,
                                    id: action.id,
                                    path: [0].join('/')
                                })
                            );
                        }}>
                        {`${action.title} - ${action.children[0].label}`}
                    </UILink>
                </>
            )}
            {action.children.length > 1 && (
                <>
                    <UILink
                        underline={false}
                        onClick={() => {
                            setShowContextualMenu(true);
                            setTarget(document.getElementById(`quick-action-children-button${actionIndex}`));
                        }}>
                        {action.title}
                    </UILink>
                    <UIIcon
                        id={`quick-action-children-button${actionIndex}`}
                        iconName={IconName.dropdown}
                        title={t('LIST')}
                        style={{ verticalAlign: 'middle' }}
                        onClick={(): void => {
                            setShowContextualMenu(true);
                            setTarget(document.getElementById(`quick-action-children-button${actionIndex}`));
                        }}
                    />
                    {showContextualMenu && (
                        <UIContextualMenu
                            target={target}
                            isBeakVisible={true}
                            beakWidth={5}
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
