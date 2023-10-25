import type { ReactElement } from 'react';
import React from 'react';

import { Stack } from '@fluentui/react';

import type {
    Change,
    PendingOtherChange,
    PendingPropertyChange,
    SavedPropertyChange,
    UnknownSavedChange,
    ValidChange
} from '@sap-ux-private/control-property-editor-common';

import { Separator } from '../../components';
import type { ControlGroupProps, ControlPropertyChange } from './ControlGroup';
import { ControlGroup } from './ControlGroup';
import type { UnknownChangeProps } from './UnknownChange';
import { UnknownChange } from './UnknownChange';

import styles from './ChangeStack.module.scss';
import { useSelector } from 'react-redux';
import type { FilterOptions } from '../../slice';
import { FilterName } from '../../slice';
import type { RootState } from '../../store';
import { convertCamelCaseToPascalCase } from '@sap-ux-private/control-property-editor-common';
import { getFormattedDateAndTime } from './utils';

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
    const stackName = changes[0].type === 'pending' ? 'unsaved-changes-stack' : 'saved-changes-stack';
    return (
        <Stack data-testid={stackName} tokens={{ childrenGap: 5, padding: '5px 0px 5px 0px' }}>
            {groups.map((item, i) => [
                isKnownChange(item) ? (
                    <Stack.Item
                        data-testid={`${stackName}-${item.controlId}-${item.changeIndex}`}
                        key={`${item.controlId}-${item.changeIndex}`}>
                        <ControlGroup {...item} />
                    </Stack.Item>
                ) : (
                    <Stack.Item key={`${item.fileName}`}>
                        <UnknownChange {...item} />
                    </Stack.Item>
                ),

                i + 1 < groups.length ? (
                    <Stack.Item key={getKey(i)}>
                        <Separator className={styles.item} />
                    </Stack.Item>
                ) : (
                    <></>
                )
            ])}
        </Stack>
    );
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

type Item = ControlGroupProps | UnknownChangeProps;

/**
 * Method to convert changes to unknown or control group.
 *
 * @param changes Change[]
 * @returns Item[]
 */
function convertChanges(changes: Change[]): Item[] {
    const items: Item[] = [];
    const savedItems: UnknownSavedChange[] = [];
    let i = 0;
    while (i < changes.length) {
        const change: Change = changes[i];
        let group: ControlGroupProps;
        if (change.type === 'saved' && change.kind === 'unknown') {
            savedItems.push(change);
            i++;
        } else {
            if (['propertyChange', 'propertyBindingChange'].includes(change.changeType)) {
                group = {
                    controlId: change.controlId,
                    controlName: change.controlName,
                    text: convertCamelCaseToPascalCase(change.controlName as string),
                    changeIndex: i,
                    changes: [classifyChange(change, i)]
                };
            } else {
                group = {
                    controlId: change.controlId,
                    controlName: change.controlName,
                    text: convertCamelCaseToPascalCase(change.controlName as string),
                    changeIndex: i,
                    changes: [change as PendingOtherChange]
                };
            }
            items.push(group);
            i++;
            while (i < changes.length) {
                // We don't need to add header again if the next control is the same
                const nextChange = changes[i];
                if (
                    (nextChange.type === 'saved' && nextChange.kind === 'unknown') ||
                    change.controlId !== nextChange.controlId
                ) {
                    break;
                }
                group.changes.push(classifyChange(nextChange, i));
                i++;
            }
        }
    }
    items.push(...arrangeSavedChanges(savedItems));
    return items;
}

/**
 * Arrange Saved Change.
 *
 * @param changes UnknownSavedChange
 * @returns Item
 */
function arrangeSavedChanges(changes: UnknownSavedChange[]): Item[] {
    const items: Item[] = [];
    let i = 0;

    // sort the changes based on the same control ID
    changes &&
        changes.sort((a, b) => {
            // Compare the 'controlId' property of the objects
            const firstControlID = a.controlId ? a.controlId : '';
            const secondControlID = b.controlId ? b.controlId : '';
            if (firstControlID < secondControlID) {
                return -1;
            }
            if (firstControlID > secondControlID) {
                return 1;
            }
            return 0;
        });

    // set the header flag, which is used in UI to set Saved Items Header.
    while (i < changes.length) {
        const change: Change = changes[i];
        const previousChange = changes[i - 1];
        if (previousChange && previousChange?.controlId === change?.controlId) {
            items.push({
                fileName: change.fileName,
                timestamp: change.timestamp,
                header: false
            });
        } else {
            items.push({
                fileName: change.fileName,
                timestamp: change.timestamp,
                header: true
            });
        }
        i++; // Increment i at the end of each iteration
    }
    return items;
}

/**
 * Classify Change for grouping.
 *
 * @param change ValidChange
 * @param changeIndex number
 * @returns ControlPropertyChange
 */
function classifyChange(change: ValidChange, changeIndex: number): ControlPropertyChange {
    let base;
    if (['propertyChange', 'propertyBindingChange'].includes(change.changeType)) {
        const { controlId, propertyName, value, controlName, changeType } = change as PendingPropertyChange;
        base = {
            controlId,
            controlName,
            propertyName,
            value,
            changeIndex,
            changeType
        };
    } else {
        const { controlId, controlName, changeType } = change;
        base = {
            controlId,
            controlName,
            changeIndex,
            changeType
        };
    }
    if (change.type === 'pending') {
        const { isActive } = change;
        return {
            ...base,
            isActive
        };
    } else {
        const { fileName, timestamp } = change;
        return {
            ...base,
            isActive: true,
            fileName,
            timestamp
        };
    }
}

/**
 * Returns true, if controlId is defined.
 *
 * @param change ControlGroupProps | UnknownChangeProps
 * @returns boolean
 */
export function isKnownChange(change: ControlGroupProps | UnknownChangeProps): change is ControlGroupProps {
    return (change as ControlGroupProps).controlId !== undefined;
}

const filterChanges = (changes: Change[], query: string): Change[] => {
    return changes.filter((item) => {
        item = item as SavedPropertyChange;
        return (
            !query ||
            item.propertyName.trim().toLowerCase().includes(query) ||
            item.changeType.trim().toLowerCase().includes(query) ||
            convertCamelCaseToPascalCase(item.propertyName.toString()).trim().toLowerCase().includes(query) ||
            item.value.toString().trim().toLowerCase().includes(query) ||
            item.fileName.toString().trim().toLowerCase().includes(query) ||
            convertCamelCaseToPascalCase(item.value.toString()).trim().toLowerCase().includes(query) ||
            (item.timestamp && getFormattedDateAndTime(item.timestamp).trim().toLowerCase().includes(query))
        );
    });
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
        if (!isKnownChange(item)) {
            continue;
        }
        const name = item.text.trim().toLowerCase();
        if (name.includes(query)) {
            parentMatch = true;
            // add node without its children
            filteredModel.push({ ...item, changes: [] });
        }
        const controlPropModel = item;
        if (controlPropModel.changes.length <= 0) {
            continue;
        }
        const data = filterChanges(controlPropModel.changes as Change[], query);

        if (parentMatch) {
            // parent matched filter query and pushed already to `filterModel`. only  replace matched children
            (filteredModel[filteredModel.length - 1] as ControlGroupProps).changes = controlPropModel.changes;
            // add node and its matched children
        } else if (data.length > 0) {
            const newFilterModel = { ...item, changes: data };
            filteredModel.push(newFilterModel as Item);
        }
    }

    return filteredModel;
}
