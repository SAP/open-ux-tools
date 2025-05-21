import type { ReactElement } from 'react';
import React, { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';

import type { UIContextualMenuItem } from '@sap-ux/ui-components';
import { UIDirectionalHint, UIIcon, UILink, UIContextualMenu, UIContextualMenuLayoutType } from '@sap-ux/ui-components';

import type { NestedQuickAction, NestedQuickActionChild } from '@sap-ux-private/control-property-editor-common';
import { executeQuickAction } from '@sap-ux-private/control-property-editor-common';
import { IconName } from '../../icons';
import type { RootState } from '../../store';

export interface NestedQuickActionListItemProps {
    action: Readonly<NestedQuickAction>;
    /**
     *  Action group index.
     */
    groupIndex: number;
    /**
     *  Action line item index.
     */
    actionIndex: number;
}

/**
 * Component for rendering Nested Quick Action.
 *
 * @param props Component props.
 * @param props.action
 * @param props.groupIndex
 * @param props.actionIndex
 * @returns ReactElement
 */
export function NestedQuickActionListItem({
    action,
    groupIndex,
    actionIndex
}: Readonly<NestedQuickActionListItemProps>): ReactElement {
    const dispatch = useDispatch();
    const isDisabled = useSelector<RootState, boolean>((state) => state.appMode === 'navigation') || !action.enabled;
    const [showContextualMenu, setShowContextualMenu] = useState(false);
    const [target, setTarget] = useState<(EventTarget & (HTMLAnchorElement | HTMLElement | HTMLButtonElement)) | null>(
        null
    );

    const flattened = flattenAction(action);

    /**
     * Build menu items for nested quick actions.
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
            const hasChildren = child.children.length > 1;
            return {
                key: `${child.label}-${index}`,
                text: child.label,
                disabled: !child.enabled,
                title: child.tooltip ?? child.label,
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
                            path: child.path,
                            id: action.id
                        })
                    );
                }
            };
        });
    };

    const buttonId = `quick-action-children-button-${groupIndex}-${actionIndex}`;
    return (
        <div className="quick-action-item">
            {flattened.children.length === 1 && (
                <UILink
                    underline={false}
                    disabled={isDisabled || !flattened.children[0].enabled}
                    title={
                        flattened.children[0].tooltip ??
                        action.tooltip ??
                        `${action.title} - ${flattened.children[0].label}`
                    }
                    onClick={(): void => {
                        dispatch(
                            executeQuickAction({
                                kind: action.kind,
                                id: action.id,
                                path: flattened.children[0].path
                            })
                        );
                    }}>
                    <span className="link-text">{action.title}</span>
                </UILink>
            )}
            {flattened.children.length > 1 && (
                <>
                    <UILink
                        title={action.tooltip ?? action.title}
                        disabled={isDisabled || !action.enabled}
                        underline={false}
                        onClick={() => {
                            setShowContextualMenu(true);
                            setTarget(document.getElementById(buttonId));
                        }}>
                        <span className={`link-text`}>{action.title}</span>
                        <UIIcon
                            id={buttonId}
                            iconName={IconName.dropdown}
                            title={action.tooltip ?? action.title}
                            style={{ verticalAlign: 'middle' }}
                            onClick={(): void => {
                                setShowContextualMenu(true);
                                setTarget(document.getElementById(buttonId));
                            }}
                        />
                    </UILink>

                    {showContextualMenu && (
                        <UIContextualMenu
                            layoutType={UIContextualMenuLayoutType.ContextualMenu}
                            showSubmenuBeneath={true}
                            target={target}
                            isBeakVisible={true}
                            items={buildMenuItems(flattened.children)}
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

/**
 * Flatten nested quick action children.
 *
 * @param action - Nested quick action.
 * @returns Quick action with flattened children.
 */
function flattenAction(action: NestedQuickAction): NestedQuickAction {
    const result = structuredClone(action);
    const stack: { node: NestedQuickActionChild; parent?: NestedQuickActionChild }[] = result.children.map((child) => ({
        node: child,
        parent: undefined
    }));
    const mergeTuples: [string | undefined, string, string][] = [];
    const lookup = new Map<string, NestedQuickActionChild>();

    while (stack.length > 0) {
        const current = stack.pop();
        if (!current) {
            continue;
        }
        const { node, parent } = current;
        lookup.set(node.path, node);
        if (node.children.length === 1) {
            const child = node.children[0];
            mergeTuples.push([parent?.path ?? '', node.path, child.path]);
        }
        for (const child of node.children) {
            stack.push({ node: child, parent: node });
        }
    }

    mergeNodes(result, mergeTuples, lookup);

    if (result.children.length === 1 && result.children[0].children.length > 0) {
        const parent = result.children[0];
        result.children = parent.children.map((child) => ({
            ...child,
            label: `${parent.label}-${child.label}`
        }));
    }

    return result;
}

/**
 * Merge nodes in the nested quick action.
 *
 * @param result - Nested quick action.
 * @param mergeTuples - Array of tuples containing parent, start and end node paths.
 * @param lookup - Lookup map of node paths to nested quick action children.
 */
function mergeNodes(
    result: NestedQuickAction,
    mergeTuples: [string | undefined, string, string][],
    lookup: Map<string, NestedQuickActionChild>
): void {
    for (const [parent, start, end] of mergeTuples) {
        const parentNode = parent ? lookup.get(parent) : result;
        const startNode = lookup.get(start);
        const endNode = lookup.get(end);
        if (!parentNode || !startNode || !endNode) {
            continue;
        }
        endNode.label = `${startNode.label}-${endNode.label}`;
        const index = parentNode.children.findIndex((parentChild) => parentChild === startNode);
        if (index !== -1) {
            parentNode.children[index] = endNode;
        }
    }
}
