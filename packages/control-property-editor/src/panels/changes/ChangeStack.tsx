import type { ReactElement } from 'react';
import React from 'react';
import { Stack } from '@fluentui/react';
import type { Change } from '@sap-ux-private/control-property-editor-common';
import {
    convertCamelCaseToPascalCase,
    PENDING_CHANGE_TYPE,
    PROPERTY_CHANGE_KIND,
    SAVED_CHANGE_TYPE,
    UNKNOWN_CHANGE_KIND
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
            {groups.map((item, i) => [
                isControlGroup(item) ? (
                    <Stack.Item
                        data-testid={`${stackName}-${item.controlId}-${item.index}`}
                        key={`${item.controlId}-${item.index}`}>
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
    let i = 0;
    while (i < changes.length) {
        const change: Change = changes[i];
        let group: ControlGroupProps;
        if (change.kind === UNKNOWN_CHANGE_KIND && change.type === SAVED_CHANGE_TYPE) {
            items.push({
                fileName: change.fileName,
                timestamp: change.timestamp,
                header: true,
                controlId: change.controlId ?? ''
            });
            i++;
        } else {
            group = {
                controlId: change.controlId,
                controlName: change.controlName,
                text: convertCamelCaseToPascalCase(change.controlName),
                index: i,
                changes: [change]
            };
            items.push(group);
            i++;
            while (i < changes.length) {
                // We don't need to add header again if the next control is the same
                const nextChange = changes[i];
                if (nextChange.kind === UNKNOWN_CHANGE_KIND || change.controlId !== nextChange.controlId) {
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
 * Checks if item is of type {@link ControlGroupProps}.
 *
 * @param item ControlGroupProps | UnknownChangeProps
 * @returns boolean
 */
function isControlGroup(item: ControlGroupProps | UnknownChangeProps): item is ControlGroupProps {
    return (item as ControlGroupProps).controlName !== undefined;
}

const filterPropertyChanges = (changes: Change[], query: string): Change[] => {
    return changes.filter((item): boolean => {
        if (item.kind === PROPERTY_CHANGE_KIND) {
            return (
                !query ||
                item.propertyName.trim().toLowerCase().includes(query) ||
                convertCamelCaseToPascalCase(item.propertyName.toString()).trim().toLowerCase().includes(query) ||
                item.value.toString().trim().toLowerCase().includes(query) ||
                convertCamelCaseToPascalCase(item.value.toString()).trim().toLowerCase().includes(query) ||
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
        if (!isControlGroup(item)) {
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
        const controlPropModel = item;
        if (controlPropModel.changes.length <= 0) {
            continue;
        }
        const data = filterPropertyChanges(controlPropModel.changes, query);

        if (parentMatch) {
            // parent matched filter query and pushed already to `filterModel`. only  replace matched children
            (filteredModel[filteredModel.length - 1] as ControlGroupProps).changes = controlPropModel.changes;
            // add node and its matched children
        } else if (data.length > 0) {
            const newFilterModel = { ...item, changes: data };
            filteredModel.push(newFilterModel);
        }
    }

    return filteredModel;
}
