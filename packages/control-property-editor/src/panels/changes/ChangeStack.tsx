import type { ReactElement } from 'react';
import React from 'react';
import { Stack } from '@fluentui/react';
import type {
    Change,
    PendingControlChange,
    PendingPropertyChange,
    SavedControlChange,
    SavedPropertyChange
} from '@sap-ux-private/control-property-editor-common';
import {
    CONTROL_CHANGE_KIND,
    convertCamelCaseToPascalCase,
    PENDING_CHANGE_TYPE,
    PROPERTY_CHANGE_KIND,
    SAVED_CHANGE_TYPE,
    UNKNOWN_CHANGE_KIND,
    CONFIGURATION_CHANGE_KIND
} from '@sap-ux-private/control-property-editor-common';

import { Separator } from '../../components';
import type { ControlGroupProps } from './ControlGroup';
import { ControlGroup } from './ControlGroup';
import type { UnknownChangeProps } from './UnknownChange';
import { UnknownChange } from './UnknownChange';

import styles from './ChangeStack.module.scss';
import { useSelector } from 'react-redux';
import type { FilterOptions } from '../../slice';
import { FilterName } from '../../slice';
import type { RootState } from '../../store';
import { getFormattedDateAndTime } from './utils';
import type { ControlItemProps } from './ControlChange';
import { ControlChange } from './ControlChange';
import type { ConfigGroupProps } from './ConfigGroup';
import { ConifgGroup } from './ConfigGroup';

export interface ChangeStackProps {
    changes: Change[];
}

/**
 * React element for Change stack.
 *
 * @param changeStackProps ChangeStackProps
 * @returns ReactElement
 */
export function ChangeStack(changeStackProps: ChangeStackProps): ReactElement {
    const { changes } = changeStackProps;
    let groups = convertChanges(changes);
    const filterQuery = useSelector<RootState, FilterOptions[]>((state) => state.filterQuery)
        .filter((item) => item.name === FilterName.changeSummaryFilterQuery)[0]
        .value.toString()
        .toLowerCase();
    groups = filterGroup(groups, filterQuery);
    const stackName = changes[0].type === PENDING_CHANGE_TYPE ? 'unsaved-changes-stack' : 'saved-changes-stack';
    return (
        <Stack data-testid={stackName} tokens={{ childrenGap: 5, padding: '5px 0px 5px 0px' }}>
            {groups.map((item, i) => [renderChangeItem(item, stackName), renderSeparator(i, groups)])}
        </Stack>
    );
}

/**
 * Renders the appropriate change item component based on the type of the item.
 *
 * @param item - The current item from the group to be rendered.
 * @param stackName - The name of the stack used for test IDs.
 * @returns The rendered change item (`ControlGroup`, `ControlChange`, or `UnknownChange`).
 */
function renderChangeItem(item: Item, stackName: string): ReactElement {
    if (isConfigPropGroup(item)) {
        return (
            <Stack.Item
                data-testid={`${stackName}-${item.configPath}-${item.index}`}
                key={`${item.configPath}-${item.index}`}>
                <ConifgGroup {...item} />
            </Stack.Item>
        );
    } else if (isPropertyGroup(item)) {
        return (
            <Stack.Item
                data-testid={`${stackName}-${item.controlId}-${item.index}`}
                key={`${item.controlId}-${item.index}`}>
                <ControlGroup {...item} />
            </Stack.Item>
        );
    } else if (isControlItem(item)) {
        return (
            <Stack.Item key={`${item.fileName}`}>
                <ControlChange {...item} />
            </Stack.Item>
        );
    } else {
        return (
            <Stack.Item key={`${item.fileName}`}>
                <UnknownChange {...item} />
            </Stack.Item>
        );
    }
}

/**
 * Renders a separator between items, except for the last one.
 *
 * @param i - The index of the current item in the group.
 * @param groups - The array of all groups to check if it's the last item.
 * @returns {ReactElement | null} The rendered separator or `null` if it's the last item.
 */
function renderSeparator(i: number, groups: Item[]): ReactElement | null {
    return i + 1 < groups.length ? (
        <Stack.Item key={getKey(i)}>
            <Separator className={styles.item} />
        </Stack.Item>
    ) : null;
}

/**
 * Generate react attribute key.
 *
 * @param i number
 * @returns string
 */
function getKey(i: number): string {
    return `${i}-separator`;
}

type Item = ControlGroupProps | UnknownChangeProps | ControlItemProps | ConfigGroupProps;

/**
 * Converts an array of changes into an array of items, grouping changes by controlId and handling different kinds of changes.
 *
 * @param {Change[]} changes - An array of changes to be converted.
 * @returns {Item[]} An array of items, some of which may be control groups.
 */
function convertChanges(changes: Change[]): Item[] {
    const items: Item[] = [];
    let i = 0;
    while (i < changes.length) {
        const change: Change = changes[i];
        let group: ControlGroupProps;
        let configGroup: ConfigGroupProps;
        if (change.kind === UNKNOWN_CHANGE_KIND) {
            items.push(handleUnknownChange(change));
            i++;
        } else if (change.kind === CONTROL_CHANGE_KIND) {
            items.push(handleControlChange(change));
            i++;
        } else if (change.kind === CONFIGURATION_CHANGE_KIND) {
            configGroup = {
                text: convertCamelCaseToPascalCase(change.kind),
                configPath: change.propertyPath,
                index: i,
                changes: [change]
            };
            items.push(configGroup);
            i++;
            while (i < changes.length) {
                // We don't need to add header again if the next control is the same
                const nextChange = changes[i];
                if (
                    nextChange.kind === UNKNOWN_CHANGE_KIND ||
                    nextChange.kind === PROPERTY_CHANGE_KIND ||
                    nextChange.kind === CONTROL_CHANGE_KIND ||
                    change.propertyPath !== nextChange?.propertyPath
                ) {
                    break;
                }
                configGroup.changes.push(nextChange);
                i++;
            }
        } else {
            group = handleGroupedChange(change, i);
            items.push(group);
            i++;
            while (i < changes.length) {
                // We don't need to add header again if the next control is the same
                const nextChange = changes[i];
                if (
                    nextChange.kind === UNKNOWN_CHANGE_KIND ||
                    nextChange.kind === CONTROL_CHANGE_KIND ||
                    nextChange.kind === CONFIGURATION_CHANGE_KIND ||
                    change.controlId !== nextChange.controlId
                ) {
                    break;
                }
                group.changes.push(nextChange);
                i++;
            }
        }
    }
    return items;
}

/**
 * Handles changes of kind `unknown` and creates an item with a header.
 *
 * @param {Change} change - The change object of kind `unknown`.
 * @returns {Item} An item object containing the filename and header information.
 */
function handleUnknownChange(change: Change): Item {
    return {
        fileName: change.fileName,
        header: true,
        ...(change?.kind === 'unknown' &&
            ['saved', 'pending'].includes(change.type) &&
            change.title && { title: change.title }),
        timestamp: change.type === SAVED_CHANGE_TYPE ? change.timestamp : undefined,
        isActive: change.type === SAVED_CHANGE_TYPE ? true : change.isActive
    };
}

/**
 * Handles changes of kind `control` and creates an item with controlId and type.
 *
 * @param {Change} change - The change object of kind `control`.
 * @returns {Item} An item object containing the filename, controlId, type, and optional timestamp.
 */
function handleControlChange(change: SavedControlChange | PendingControlChange): Item {
    const title = change.title;
    return {
        fileName: change.fileName,
        controlId: change.controlId,
        timestamp: change.type === SAVED_CHANGE_TYPE ? change.timestamp : undefined,
        isActive: change.type === SAVED_CHANGE_TYPE ? true : change.isActive,
        type: change.type,
        ...(title && { title })
    };
}

/**
 * Handles grouped changes by initializing a control group with a list of changes that share the same controlId.
 *
 * @param {Change} change - The initial change object to start the group.
 * @param {number} i - The index of the initial change in the list.
 * @returns {ControlGroupProps} A control group object containing grouped changes.
 */
function handleGroupedChange(change: PendingPropertyChange | SavedPropertyChange, i: number): ControlGroupProps {
    return {
        controlId: change.controlId,
        controlName: change.controlName,
        text: convertCamelCaseToPascalCase(change.controlName),
        index: i,
        changes: [change],
        timestamp: change.type === SAVED_CHANGE_TYPE ? change.timestamp : undefined
    };
}

/**
 * Checks if item is of type {@link ControlGroupProps}.
 *
 * @param item ControlGroupProps | UnknownChangeProps | ControlItemProps
 * @returns boolean
 */
function isPropertyGroup(item: ControlGroupProps | UnknownChangeProps | ControlItemProps): item is ControlGroupProps {
    return (item as ControlGroupProps).controlName !== undefined;
}

/**
 * Checks if item is of type {@link ControlItemProps}.
 *
 * @param item UnknownChangeProps | ControlItemProps
 * @returns boolean
 */
function isControlItem(item: UnknownChangeProps | ControlItemProps): item is ControlItemProps {
    return item?.controlId !== undefined;
}

const filterPropertyChanges = (changes: Change[], query: string): Change[] => {
    return changes.filter((item): boolean => {
        if (item.kind === PROPERTY_CHANGE_KIND || item.kind === CONFIGURATION_CHANGE_KIND) {
            return (
                !query ||
                item.propertyName.trim().toLowerCase().includes(query) ||
                convertCamelCaseToPascalCase(item.propertyName.toString()).trim().toLowerCase().includes(query) ||
                item.value.toString().trim().toLowerCase().includes(query) ||
                convertCamelCaseToPascalCase(item.value.toString()).trim().toLowerCase().includes(query) ||
                (item.kind === CONFIGURATION_CHANGE_KIND && item.propertyPath.trim().toLowerCase().includes(query)) ||
                (item.type === SAVED_CHANGE_TYPE &&
                    getFormattedDateAndTime(item.timestamp).trim().toLowerCase().includes(query))
            );
        } else {
            const changeType = convertCamelCaseToPascalCase(item.changeType);
            return !query || changeType.trim().toLowerCase().includes(query);
        }
    });
};

const isQueryMatchesChange = (item: UnknownChangeProps, query: string): boolean => {
    const parts = item.fileName.split('_');
    const changeName = parts[parts.length - 1];
    const name = convertCamelCaseToPascalCase(changeName + 'Change');
    let dateTime = '';
    if (item.timestamp) {
        dateTime = getFormattedDateAndTime(item.timestamp).trim();
    }
    return (
        !query ||
        item.fileName.trim().toLowerCase().includes(query) ||
        name.trim().toLowerCase().includes(query) ||
        dateTime.toLowerCase().includes(query)
    );
};

/**
 * Filter group in change stack.
 *
 * @param model Item[]
 * @param query string
 * @returns Item[]
 */
function filterGroup(model: Item[], query: string): Item[] {
    const filteredModel: Item[] = [];
    if (query.length === 0) {
        return model;
    }
    for (const item of model) {
        let parentMatch = false;
        if (!isConfigPropGroup(item) && !isPropertyGroup(item)) {
            if (isQueryMatchesChange(item, query)) {
                filteredModel.push({ ...item, changes: [] });
            }
            continue;
        }
        const name = item.text.trim().toLowerCase();
        if (name.includes(query)) {
            parentMatch = true;
            // add node without its children
            filteredModel.push({ ...item, changes: [] });
        }
        const controlPropModel: ControlGroupProps | ConfigGroupProps = item;
        if (controlPropModel.changes.length <= 0) {
            continue;
        }
        const data = filterPropertyChanges(controlPropModel.changes, query);

        if (parentMatch) {
            // parent matched filter query and pushed already to `filterModel`. only  replace matched children
            (filteredModel[filteredModel.length - 1] as ControlGroupProps | ConfigGroupProps).changes =
                controlPropModel.changes;
            // add node and its matched children
        } else if (data.length > 0) {
            const newFilterModel = { ...item, changes: data };
            filteredModel.push(newFilterModel as ConfigGroupProps | ControlGroupProps);
        }
    }

    return filteredModel;
}

/**
 * Checks if item is of type {@link ConfigGroupProps}.
 *
 * @param item ControlGroupProps | UnknownChangeProps | ConfigGroupProps
 * @returns boolean
 */
function isConfigPropGroup(item: ControlGroupProps | UnknownChangeProps | ConfigGroupProps): item is ConfigGroupProps {
    return (item as ConfigGroupProps).configPath !== undefined;
}
