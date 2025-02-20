import React, { useCallback, useEffect, useMemo, useState } from 'react';
import type { ReactElement } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import type { IGroup, IGroupRenderProps, IGroupHeaderProps } from '@fluentui/react';
import { Icon } from '@fluentui/react';
import {
    UIContextualMenu,
    UIContextualMenuLayoutType,
    UIDirectionalHint,
    UIList,
    UiIcons
} from '@sap-ux/ui-components';
import type { UIContextualMenuItem } from '@sap-ux/ui-components';
import { useTranslation } from 'react-i18next';

import {
    selectControl,
    reportTelemetry,
    addExtensionPoint,
    executeContextMenuAction,
    requestControlContextMenu
} from '@sap-ux-private/control-property-editor-common';
import type { ContextMenu, Control, OutlineNode } from '@sap-ux-private/control-property-editor-common';

import type { RootState } from '../../store';
import type { ControlChanges, FilterOptions } from '../../slice';
import { FilterName } from '../../slice';
import { NoControlFound } from './NoControlFound';
import { adaptExpandCollapsed, getFilteredModel, isSame } from './utils';
import { ChangeIndicator } from '../../components/ChangeIndicator';

interface OutlineNodeItem extends OutlineNode {
    level: number;
    path: string[];
}

export const Tree = (): ReactElement => {
    // padding + height of `Search` bar
    const SEARCH_HEIGHT = 57;

    // height of the tree row in a outline
    const TREE_ROW_HEIGHT = 28;

    // margin of the highlighted control from the top including `Search` bar height and tree row height, it doesn't include the height of main toolbar
    const HIGHLIGHTED_CONTROL_TOP_MARGIN = SEARCH_HEIGHT + TREE_ROW_HEIGHT;

    const dispatch = useDispatch();
    const { t } = useTranslation();

    const [collapsed, setCollapsed] = useState<IGroup[]>([]);
    const [selection, setSelection] = useState<{ group: undefined | IGroup; cell: undefined | OutlineNodeItem }>({
        group: undefined,
        cell: undefined
    });
    const [showActionContextualMenu, setShowActionContextualMenu] = useState<OutlineNodeItem | undefined>();
    const filterQuery = useSelector<RootState, FilterOptions[]>((state) => state.filterQuery);
    const selectedControl = useSelector<RootState, Control | undefined>((state) => state.selectedControl);
    const controlChanges = useSelector<RootState, ControlChanges>((state) => state.changes.controls);
    const contextMenu = useSelector<RootState, ContextMenu | undefined>((state) => state.contextMenu);
    const model: OutlineNode[] = useSelector<RootState, OutlineNode[]>((state) => state.outline);
    const isNavigationMode = useSelector<RootState, boolean>((state) => state.appMode === 'navigation');

    const { groups, items } = useMemo(() => {
        const items: OutlineNodeItem[] = [];
        const filteredModel = getFilteredModel(model, filterQuery);
        return { groups: getGroups(filteredModel, items), items };
    }, [model, filterQuery, selection, controlChanges]);

    const selectedClassName =
        localStorage.getItem('theme') === 'high contrast' ? 'app-panel-hc-selected-bg' : 'app-panel-selected-bg';

    useEffect(() => {
        if (selection.cell === undefined && selection.group === undefined && selectedControl !== undefined) {
            updateSelectionFromPreview(selectedControl);
        }

        if (selection.cell !== undefined && selectedControl !== undefined) {
            if (selection.cell.controlId !== selectedControl.id) {
                updateSelectionFromPreview(selectedControl);
            }
        }

        if (selection.group !== undefined && selectedControl !== undefined) {
            if (selection.group.key !== selectedControl.id) {
                updateSelectionFromPreview(selectedControl);
            }
        }
    }, [selectedControl]);
    useMemo(() => {
        adaptExpandCollapsed(groups, collapsed);
    }, [groups, collapsed, selection]);

    const scrollRef = useCallback((node: Element) => {
        if (node !== null) {
            setTimeout(() => {
                // make sure that tree is fully rendered
                const rect = node.getBoundingClientRect();
                const outlineContainer = document.getElementsByClassName('auto-element-scroller')[0];

                // check if highlighted control is behind the `Search` bar or check if it is outside of viewport from bottom
                if (rect.top <= HIGHLIGHTED_CONTROL_TOP_MARGIN || rect.bottom >= outlineContainer?.clientHeight) {
                    node.scrollIntoView(true);
                }
            }, 0);
        }
    }, []);

    /**
     * Find in group.
     *
     * @param control Control
     * @param group IGroup
     * @returns IGroup[] | undefined
     */
    function findInGroup(control: Control, group: IGroup): IGroup[] | undefined {
        if (group.key === control.id) {
            return [group];
        }

        if (group.children !== undefined) {
            const result = findInGroups(control, group.children);
            if (result) {
                return [group, ...result];
            }
        }
        return undefined;
    }

    /**
     * Find in group collection.
     *
     * @param control Control
     * @param groups  IGroup[]
     * @returns IGroup[] | undefined
     */
    function findInGroups(control: Control, groups: IGroup[]): IGroup[] | undefined {
        for (const group of groups) {
            const result = findInGroup(control, group);
            if (result !== undefined) {
                return [group, ...result];
            }
        }
        return undefined;
    }

    type CurrentType = IGroup | IGroup[] | undefined;

    /**
     * Sets current item.
     *
     * @param current CurrentType,
     * @param segment string
     * @returns CurrentType
     */
    function setCurrentItem(current: CurrentType, segment: string): CurrentType {
        if (Array.isArray(current)) {
            current = current[parseInt(segment, 10)];
        } else if (current && segment === 'children') {
            current = current.children;
        } else {
            current = undefined;
        }
        if (!Array.isArray(current) && current) {
            current.isCollapsed = false;
        }
        return current;
    }

    /**
     * Update selection from preview.
     *
     * @param control Control
     */
    function updateSelectionFromPreview(control: Control): void {
        const item = items.find((item) => item.controlId === control.id);
        const pathToGroup = findInGroups(control, groups);
        if (pathToGroup) {
            for (const group of pathToGroup) {
                group.isCollapsed = false;
            }
            setSelection({
                group: pathToGroup.slice(-1)[0],
                cell: undefined
            });
        } else if (item) {
            let current: CurrentType = groups;
            for (const segment of item.path) {
                current = setCurrentItem(current, segment);
            }
            setSelection({
                group: undefined,
                cell: item
            });
        } else if (selection.cell !== undefined || selection.group !== undefined) {
            setSelection({
                group: undefined,
                cell: undefined
            });
        }
    }

    if (items.length === 0 && groups.length === 0) {
        return <NoControlFound />;
    }
    const onContextMenuAction = (
        e: React.MouseEvent<HTMLSpanElement, MouseEvent>,
        cellItem?: OutlineNodeItem,
        headerItem?: IGroup
    ): void => {
        e.preventDefault();
        let selectAction;
        const item = cellItem ?? headerItem?.data;
        const controlId = item.controlId;
        if (headerItem) {
            setSelection({
                group: headerItem,
                cell: undefined
            });
            selectAction = selectControl(headerItem.key);
        } else {
            setSelection({
                group: undefined,
                cell: item
            });
            selectAction = selectControl(controlId);
        }
        dispatch(selectAction);
        if (item?.controlType !== 'sap.ui.extensionpoint') {
            dispatch(requestControlContextMenu.pending(controlId));
        }
        setShowActionContextualMenu(item);
    };
    const onSelectCell = (item: OutlineNodeItem): void => {
        setSelection({
            group: undefined,
            cell: item
        });
        const action = selectControl(item.controlId);
        dispatch(action);
    };
    const onSelectHeader = (node: IGroup | undefined): void => {
        if (node) {
            setSelection({
                group: node,
                cell: undefined
            });
            const name = (node.data.controlType as string).toLowerCase().startsWith('sap')
                ? node.data.controlType
                : 'Other Control Types';
            reportTelemetry({ category: 'Outline Selection', controlName: name }).catch((error) => {
                console.error(`Error in reporting telemetry`, error);
            });
            const action = selectControl(node.key);
            dispatch(action);
        }
    };
    /**
     * Build menu items for context menu.
     *
     * @returns ReactElement
     */
    const buildMenuItems = function (): UIContextualMenuItem[] {
        if (!showActionContextualMenu) {
            return [];
        }
        const { controlId, controlType } = showActionContextualMenu;
        const isExtensionPoint = controlType === 'sap.ui.extensionpoint';
        const children = isExtensionPoint
            ? [
                  {
                      id: '',
                      title: t('ADD_FRAGMENT_AT_EXTENSION_POINT'),
                      enabled: true
                  }
              ]
            : contextMenu?.contextMenuItems;
        return (children ?? []).map((child, index) => {
            return {
                key: `${controlId}-${child.id}-${index}`,
                text: child?.title,
                disabled: isNavigationMode ? true : !child.enabled,
                title: isNavigationMode
                    ? t('CONTEXT_MENU_ACTION_DISABLED_IN_NAVIGATION_MODE')
                    : child?.tooltip ?? child?.title,
                onClick(): void {
                    if (isExtensionPoint) {
                        dispatch(addExtensionPoint(showActionContextualMenu));
                    } else {
                        dispatch(
                            executeContextMenuAction({
                                controlId,
                                actionName: child.id
                            })
                        );
                    }
                }
            };
        });
    };
    const onRenderCell = (nestingDepth?: number, item?: OutlineNodeItem, itemIndex?: number): React.ReactNode => {
        const paddingValue = (item?.level ?? 0) * 10 + 45;
        const classNames: string[] = ['tree-row'];
        const props: {
            ref?: (node: HTMLDivElement) => void;
        } = {};

        if (selection.cell?.controlId === item?.controlId) {
            props.ref = scrollRef;
            classNames.push(selectedClassName);
        }

        const focus = filterQuery.find((item) => item.name === FilterName.focusEditable)?.value;
        if (!item?.editable && focus === true) {
            classNames.push('focusEditable');
        }

        const controlChange = controlChanges[item?.controlId ?? ''];
        const indicator = controlChange ? (
            <ChangeIndicator id={`${item?.controlId}--ChangeIndicator`} {...controlChange} type="control" />
        ) : (
            <></>
        );
        const isExtensionPoint = item?.controlType === 'sap.ui.extensionpoint';
        const hasDefaultContent = item?.hasDefaultContent || false;

        const cellName = hasDefaultContent
            ? t('EXTENSION_POINT_HAS_DEFAULT_CONTENT_TEXT', { name: item?.name })
            : item?.name;
        return item && typeof itemIndex === 'number' && itemIndex > -1 ? (
            <div
                aria-hidden
                id={item.controlId}
                data-control-id={isExtensionPoint ? `${item.controlId}--extensionPoint` : item.controlId}
                className={classNames.join(' ')}
                onClick={(): void => onSelectCell(item)}
                onContextMenu={(e) => onContextMenuAction(e, item)}>
                <span {...props} style={{ paddingLeft: paddingValue }} className="tree-cell">
                    {isExtensionPoint && <Icon className="extension-icon" iconName={UiIcons.DataSource} />}

                    <div
                        style={{
                            cursor: 'auto',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            display: 'block'
                        }}
                        title={isExtensionPoint ? item?.name : ''}>
                        {cellName}
                    </div>
                </span>
                <div style={{ marginLeft: '10px', marginRight: '10px' }}>{indicator}</div>
            </div>
        ) : null;
    };
    const onToggleCollapse = (groupHeaderProps?: IGroupHeaderProps): void => {
        if (groupHeaderProps?.onToggleCollapse && groupHeaderProps?.group) {
            groupHeaderProps?.onToggleCollapse(groupHeaderProps?.group);
        }

        const isCollapsed = groupHeaderProps?.group?.isCollapsed;
        if (groupHeaderProps?.group) {
            if (isCollapsed) {
                // set collapsed row
                setCollapsed([...collapsed, groupHeaderProps.group]);
            } else {
                // filter expanded row
                const filterNodes = collapsed.filter(
                    (item) => !isSame(item.data.path, groupHeaderProps.group?.data.path)
                );
                setCollapsed(filterNodes);
            }
        }
    };
    const onRenderHeader = (groupHeaderProps?: IGroupHeaderProps): React.JSX.Element | null => {
        const selectNode = selection.group?.key === groupHeaderProps?.group?.key ? selectedClassName : '';
        let paddingValue = (groupHeaderProps?.group?.level ?? 0) * 10 + 15;
        // add padding to compensate absence of chevron icon
        if (groupHeaderProps?.group?.count === 0) {
            paddingValue += 15;
        }
        const chevronTransform =
            groupHeaderProps?.group?.key && groupHeaderProps.group.isCollapsed
                ? 'right-chevron-icon'
                : 'down-chevron-icon';
        const groupName = `${groupHeaderProps?.group?.name}`;
        const refProps: {
            ref?: (node: HTMLDivElement) => void;
        } = {};
        if (selectNode) {
            refProps.ref = scrollRef;
        }
        const data = groupHeaderProps?.group?.data as OutlineNodeItem;
        const isExtensionPoint = data?.controlType === 'sap.ui.extensionpoint';
        const hasDefaultContent = data?.hasDefaultContent || false;
        const focus = filterQuery.filter((item) => item.name === FilterName.focusEditable)[0].value as boolean;
        const focusEditable = !data?.editable && focus ? 'focusEditable' : '';
        const controlChange = controlChanges[groupHeaderProps?.group?.key ?? ''];
        const indicator = controlChange ? (
            <ChangeIndicator
                id={`${groupHeaderProps?.group?.key ?? ''}--ChangeIndicator`}
                {...controlChange}
                type="control"
            />
        ) : (
            <></>
        );

        const headerName = hasDefaultContent
            ? t('EXTENSION_POINT_HAS_DEFAULT_CONTENT_TEXT', { name: groupName })
            : groupName;
        return (
            <div
                data-control-id={isExtensionPoint ? `${data.controlId}--extensionPoint` : data.controlId}
                {...refProps}
                aria-hidden
                className={`${selectNode} tree-row ${focusEditable}`}
                onClick={(): void => onSelectHeader(groupHeaderProps?.group)}
                onContextMenu={(e) => onContextMenuAction(e, undefined, groupHeaderProps?.group)}>
                <span style={{ paddingLeft: paddingValue }} className="tree-cell">
                    {groupHeaderProps?.group?.count !== 0 && (
                        <Icon
                            className={chevronTransform}
                            iconName={UiIcons.Chevron}
                            onClick={(event) => {
                                onToggleCollapse(groupHeaderProps);
                                event.stopPropagation();
                            }}
                        />
                    )}

                    {isExtensionPoint && <Icon className="extension-icon" iconName={UiIcons.DataSource} />}

                    <div
                        style={{
                            cursor: 'pointer',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis'
                        }}
                        title={isExtensionPoint ? groupName : ''}>
                        {headerName}
                    </div>
                </span>
                <div style={{ marginLeft: '10px', marginRight: '10px' }}>{indicator}</div>
            </div>
        );
    };
    const groupRenderProps: IGroupRenderProps = {
        showEmptyGroups: true,
        isAllGroupsCollapsed: false,
        onRenderHeader
    };

    // workaround for UIList not exposing GroupedList props
    const listProp: {
        onShouldVirtualize: () => false;
        usePageCache: boolean;
    } = {
        onShouldVirtualize: () => false,
        usePageCache: true
    };

    return (
        <div id="list-outline" className="app-panel-scroller auto-element-scroller">
            <UIList
                {...listProp}
                items={items as never[]}
                onRenderCell={onRenderCell}
                groups={groups}
                onSelect={onSelectHeader}
                groupProps={groupRenderProps}
            />
            {showActionContextualMenu && (
                <UIContextualMenu
                    layoutType={UIContextualMenuLayoutType.ContextualMenu}
                    showSubmenuBeneath={true}
                    target={`[data-control-id="${
                        showActionContextualMenu.controlType === 'sap.ui.extensionpoint'
                            ? `${showActionContextualMenu.controlId}--extensionPoint`
                            : showActionContextualMenu.controlId
                    }"]`}
                    isBeakVisible={true}
                    items={buildMenuItems()}
                    directionalHint={UIDirectionalHint.bottomRightEdge}
                    onDismiss={() => setShowActionContextualMenu(undefined)}
                    iconToLeft={true}
                />
            )}
        </div>
    );
};

/**
 * Checks a child can be added.
 *
 * @param model OutlineNode[]
 * @returns boolean
 */
function createGroupChild(model: OutlineNode[]): boolean {
    let result = false;
    for (const data of model) {
        const children = data.children || [];
        if (children.length > 0) {
            result = true;
            break;
        }
    }
    return result;
}

/**
 * Get groups.
 *
 * @param model OutlineNode[]
 * @param items  OutlineNodeItem[]
 * @param level number, default to 0
 * @param path string
 * @returns IGroup[]
 */
function getGroups(model: OutlineNode[], items: OutlineNodeItem[], level = 0, path: string[] = []): IGroup[] {
    const group: IGroup[] = [];
    for (let i = 0; i < model.length; i++) {
        const data = model[i];
        const children = data.children || [];
        const count = children.length; // no of item for each group
        const newPath = [...path, i.toString(), 'children'];
        const newGroup = {
            count,
            key: `${data.controlId}`,
            name: data.name,
            startIndex: items.length,
            level: level,
            children: [] as IGroup[],
            isCollapsed: count === 0,
            data: { ...data, path: newPath }
        };

        const shouldCreate = createGroupChild(children);
        newGroup.children = shouldCreate ? getGroups(children, items, level + 1, newPath) : [];
        group.push(newGroup);
        // add node children to item
        if (!shouldCreate) {
            children.forEach((item, i) => items.push({ ...item, level, path: [...newPath, i.toString()] }));
        }
    }
    return group;
}
