import type { ReactElement } from 'react';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useDispatch } from 'react-redux';

import { UICallout, UIDirectionalHint, UIIcon, UILink, UiIcons } from '@sap-ux/ui-components';

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

    const [expandedCallouts, setExpandedCallouts] = useState<number[]>([]);

    /**
     *
     * @param title Node title.
     * @param children Node children.
     * @returns ReactElement
     */
    function getNode(title: string, children: NestedQuickActionChild[]): ReactElement | ReactElement[] {
        if (children.length === 1) {
            return (
                <UILink
                    // key={action.type}
                    onClick={() => {
                        dispatch(
                            executeQuickAction({
                                kind: action.kind,
                                type: action.type,
                                path: [...expandedCallouts.slice(1), 0].join('/')
                            })
                        );
                    }}>
                    {title}
                </UILink>
            );
        } else {
            return children.map((child, index) => (
                <UILink
                    className={`quick-action-child-link`}
                    key={index}
                    underline={false}
                    onClick={() => {
                        dispatch(
                            executeQuickAction({
                                kind: action.kind,
                                type: action.type,
                                path: [...expandedCallouts.slice(1), index].join('/')
                            })
                        );
                        setExpandedCallouts([]);
                    }}>
                    {child.label}
                </UILink>
            ));
        }
    }

    return (
        <>
            <div className={`quick-action-item`}>
                <UILink key={action.type} onClick={() => {}}>
                    {action.title}
                </UILink>
                <UIIcon
                    id={`quick-action-children-button`}
                    className={`icon-down`}
                    // iconProps={{
                    //     iconName: UiIcons.ChevronDown
                    // }}
                    iconName={UiIcons.ChevronDown}
                    title={t('LIST')}
                    onClick={(): void => {
                        setExpandedCallouts([0]);
                    }}
                />
                {expandedCallouts.length > 0 && (
                    <UICallout
                        id={'action-selector'}
                        data-testid={'action-selector-callout'}
                        role="alertdialog"
                        alignTargetEdge
                        target={'#quick-action-children-button'}
                        finalHeight={45}
                        isBeakVisible={true}
                        beakWidth={5}
                        directionalHint={UIDirectionalHint.bottomCenter}
                        styles={{
                            calloutMain: {
                                minWidth: 100
                            }
                        }}
                        onDismiss={(): void => {
                            setExpandedCallouts([]);
                        }}>
                        <div className={'action-callout-children'}>{getNode(action.title, action.children)}</div>
                    </UICallout>
                )}
            </div>
        </>
    );
}
