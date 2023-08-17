import React, { ReactElement, useCallback, useEffect, useMemo, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import type { IGroup, IGroupRenderProps, IGroupHeaderProps } from '@fluentui/react';
import { Icon } from '@fluentui/react';
import { UIList } from '@sap-ux/ui-components';

import { selectControl } from '../../../api';
import type { Control, OutlineNode } from '../../../api';

import type { RootState } from '../../store';
import { reportTelemetry } from '../../../telemetry';
import { IconName } from '../../icons';
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
    const dispatch = useDispatch();
    const [selection, setSelection] = useState<{ group: undefined | IGroup; cell: undefined | OutlineNodeItem }>({
        group: undefined,
        cell: undefined
    });
    const [collapsed, setCollapsed] = useState<IGroup[]>([]);
    const filterQuery = useSelector<RootState, FilterOptions[]>((state) => state.filterQuery);
    const selectedControl = useSelector<RootState, Control | undefined>((state) => state.selectedControl);
    const controlChanges = useSelector<RootState, ControlChanges>((state) => state.changes.controls);
    const model: OutlineNode[] = useSelector<RootState, OutlineNode[]>((state) => state.outline);
    const { groups, items } = useMemo(() => {
        const items: OutlineNodeItem[] = [];
        const filteredModel = getFilteredModel(model, filterQuery);
        return { groups: getGroups(filteredModel, items), items };
    }, [model, filterQuery, selection]);
    const theme =
        document.getElementsByTagName('HTML')[0].getAttribute('data-theme') === 'high contrast'
            ? 'app-panel-hc-selected-bg'
            : 'app-panel-selected-bg';

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

    const scrollRef = useCallback((node) => {
        if (node !== null) {
            setTimeout(() => {
                // make sure that tree is fully rendered
                const rect = node.getBoundingClientRect();
                const outlineContainer = document.getElementsByClassName('section--scrollable')[0];
                if (rect.top <= 20 || rect.bottom >= outlineContainer?.clientHeight) {
                    node.scrollIntoView(true);
                }
            }, 0);
        }
    }, []);

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
    }

    function findInGroups(control: Control, groups: IGroup[]): IGroup[] | undefined {
        for (const group of groups) {
            const result = findInGroup(control, group);
            if (result !== undefined) {
                return [group, ...result];
            }
        }
    }

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
            let current: IGroup | IGroup[] | undefined = groups;
            for (const segment of item.path) {
                current = (current as any)[segment];
                if (!Array.isArray(current) && current) {
                    current.isCollapsed = false;
                }
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
            try {
                const name = (node.data.controlType as string).toLowerCase().startsWith('sap')
                    ? node.data.controlType
                    : 'Other Control Types';
                reportTelemetry({ category: 'Outline Selection', controlName: name });
            } catch (error) {
                console.error(`Error in reporting telemetry`, error);
            } finally {
                const action = selectControl(node.key);
                dispatch(action);
            }
        }
    };
    const onRenderCell = (nestingDepth?: number, item?: OutlineNodeItem, itemIndex?: number): React.ReactNode => {
        const paddingValue = (item?.level ?? 0) * 10 + 45;
        const selectNode = selection.cell?.controlId === item?.controlId ? theme : '';
        const props: any = {};
        if (selectNode) {
            props.ref = scrollRef;
        }
        const focus = filterQuery.filter((item) => item.name === FilterName.focusEditable)[0].value as boolean;
        const focusEditable = !item?.editable && focus ? 'focusEditable' : '';
        const controlChange = controlChanges[item?.controlId ?? ''];
        const indicator = controlChange ? (
            <ChangeIndicator id={`${item?.controlId}--ChangeIndicator`} {...controlChange} />
        ) : (
            <></>
        );
        return item && typeof itemIndex === 'number' && itemIndex > -1 ? (
            <div
                className={`${selectNode} tree-row ${focusEditable}`}
                onClick={(): void => onSelectCell(item)}
                id={item.controlId}>
                <div
                    {...props}
                    className={`tree-cell`}
                    style={{
                        paddingLeft: paddingValue,
                        cursor: 'auto',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        display: 'block'
                    }}>
                    {item.name}
                </div>
                <div style={{ marginLeft: '10px', marginRight: '10px' }}>{indicator}</div>
            </div>
        ) : null;
    };
    const onToggleCollapse = (props?: IGroupHeaderProps): void => {
        // eslint-disable-next-line @typescript-eslint/no-non-null-asserted-optional-chain
        props?.onToggleCollapse!(props?.group!);

        const isCollapsed = props?.group?.isCollapsed;
        if (props?.group) {
            if (isCollapsed) {
                // set collapsed row
                setCollapsed([...collapsed, props.group]);
            } else {
                // filter expanded row
                const filterNodes = collapsed.filter((item) => !isSame(item.data.path, props.group?.data.path));
                setCollapsed(filterNodes);
            }
        }
    };
    const onRenderHeader = (props?: IGroupHeaderProps): JSX.Element | null => {
        const selectNode = selection.group?.key === props?.group?.key ? theme : '';
        let paddingValue = (props?.group?.level ?? 0) * 10 + 15;
        // add padding to compensate absence of chevron icon
        if (props?.group?.count === 0) {
            paddingValue += 15;
        }
        const chevronTransform =
            props?.group?.key && props.group.isCollapsed ? 'right-chevron-icon' : 'down-chevron-icon';
        const groupName = `${props?.group?.name}`;
        const refProps: any = {};
        if (selectNode) {
            refProps.ref = scrollRef;
        }
        const focus = filterQuery.filter((item) => item.name === FilterName.focusEditable)[0].value as boolean;
        const focusEditable = !props?.group?.data?.editable && focus ? 'focusEditable' : '';
        const controlChange = controlChanges[props?.group?.key ?? ''];
        const indicator = controlChange ? (
            <ChangeIndicator id={`${props?.group?.key ?? ''}--ChangeIndicator`} {...controlChange} />
        ) : (
            <></>
        );
        return (
            <div
                {...refProps}
                className={`${selectNode} tree-row ${focusEditable}`}
                onClick={(): void => onSelectHeader(props?.group)}>
                <span style={{ paddingLeft: paddingValue }} className={`tree-cell`}>
                    {props?.group?.count !== 0 && (
                        <Icon
                            className={`${chevronTransform}`}
                            iconName={IconName.chevron}
                            onClick={(event) => {
                                onToggleCollapse(props);
                                event.stopPropagation();
                            }}
                        />
                    )}
                    <div
                        style={{
                            cursor: 'pointer',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis'
                        }}>
                        {groupName}
                    </div>
                </span>
                <div style={{ marginLeft: '10px', marginRight: '10px' }}>{indicator}</div>
            </div>
        );
    };
    const groupRenderProps: IGroupRenderProps = {
        showEmptyGroups: true,
        onRenderHeader
    };

    // workaround for UIList not exposing GroupedList props
    const listProp: any = {
        onShouldVirtualize: () => false,
        usePageCache: true
    };

    return (
        <div id="list-outline" className="app-panel-scroller">
            <UIList
                {...listProp}
                items={items as never[]}
                onRenderCell={onRenderCell}
                groups={groups}
                onSelect={onSelectHeader}
                groupProps={groupRenderProps as any}></UIList>
        </div>
    );
};

function createGroupChild(model: OutlineNode[]): boolean {
    let result = false;
    for (let i = 0; i < model.length; i++) {
        const data = model[i];
        const children = data.children || [];
        if (children.length > 0) {
            return (result = true);
        }
    }
    return result;
}

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
