import type { ReactElement } from 'react';
import React from 'react';
import { Link, Stack } from '@fluentui/react';

import { useAppDispatch } from '../../store';
import type { Change } from '@sap-ux-private/control-property-editor-common';
import { PROPERTY_CHANGE_KIND, SAVED_CHANGE_TYPE, selectControl } from '@sap-ux-private/control-property-editor-common';

import { PropertyChange } from './PropertyChange';
import { OtherChange } from './OtherChange';

import styles from './ControlGroup.module.scss';

export interface ControlGroupProps {
    text: string;
    controlId: string;
    controlName: string;
    index: number;
    changes: Change[];
}

/**
 * React Element for control groups.
 *
 * @param controlGroupProps ControlGroupProps
 * @returns ReactElement
 */
export function ControlGroup(controlGroupProps: ControlGroupProps): ReactElement {
    const { text, controlId, changes } = controlGroupProps;
    const dispatch = useAppDispatch();
    const stackName = changes[0].type === SAVED_CHANGE_TYPE ? `saved-changes-stack` : `unsaved-changes-stack`;
    return (
        <Stack>
            <Stack.Item className={styles.header}>
                <Link
                    onClick={(): void => {
                        const action = selectControl(controlId);
                        dispatch(action);
                    }}
                    style={{
                        color: 'var(--vscode-textLink-foreground)',
                        fontSize: '13px',
                        fontWeight: 'bold',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        overflowX: 'hidden',
                        lineHeight: '18px'
                    }}>
                    {text}
                </Link>
            </Stack.Item>
            {changes.map((change) => {
                return (
                    <Stack.Item
                        data-testid={`${stackName}-${controlId}-${
                            change.kind === PROPERTY_CHANGE_KIND ? change.propertyName : change.changeType
                        }-${change.fileName}`}
                        key={change.fileName}
                        className={styles.item}>
                        {change.kind === PROPERTY_CHANGE_KIND ? (
                            <PropertyChange change={change} actionClassName={styles.actions} />
                        ) : (
                            <OtherChange change={change} actionClassName={styles.actions} />
                        )}
                    </Stack.Item>
                );
            })}
        </Stack>
    );
}
