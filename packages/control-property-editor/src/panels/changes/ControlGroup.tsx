import type { ReactElement } from 'react';
import React from 'react';
import { Link, Stack } from '@fluentui/react';

import { useAppDispatch } from '../../store';
import { selectControl } from '@sap-ux-private/control-property-editor-common';

import type { ChangeProps } from './ChangesPanel';
import { PropertyChange } from './PropertyChange';
import { OtherChange } from './OtherChange';

import styles from './ControlGroup.module.scss';

export interface ControlGroupProps {
    text: string;
    controlId: string;
    controlName: string;
    changeIndex: number;
    changes: ControlChange[];
}
export type ControlChange = Omit<ChangeProps, 'actionClassName'>;

/**
 * React Element for control groups.
 *
 * @param controlGroupProps ControlGroupProps
 * @returns ReactElement
 */
export function ControlGroup(controlGroupProps: ControlGroupProps): ReactElement {
    const { text, controlId, changes } = controlGroupProps;
    const dispatch = useAppDispatch();
    const stackName = changes[0].timestamp ? `saved-changes-stack` : `unsaved-changes-stack`;
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
            {changes.map((change) => (
                <Stack.Item
                    data-testid={`${stackName}-${controlId}-${change.propertyName ?? change.changeType}-${
                        change.changeIndex
                    }`}
                    key={`${change.changeIndex}`}
                    className={styles.item}>
                    {['propertyChange', 'propertyBindingChange'].includes(change.changeType) ? (
                        <PropertyChange {...change} actionClassName={styles.actions} />
                    ) : (
                        <OtherChange {...change} actionClassName={styles.actions} />
                    )}
                </Stack.Item>
            ))}
        </Stack>
    );
}
