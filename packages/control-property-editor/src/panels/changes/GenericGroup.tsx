import type { ReactElement } from 'react';
import React from 'react';
import { Link, Stack, Text } from '@fluentui/react';

import type {
    GENERIC_CHANGE_KIND,
    PendingGenericChange,
    SavedGenericChange
} from '@sap-ux-private/control-property-editor-common';
import { SAVED_CHANGE_TYPE, selectControl } from '@sap-ux-private/control-property-editor-common';

import styles from './GenericGroup.module.scss';
import { GenericChange } from './GenericChange';
import { useDispatch } from 'react-redux';

export interface GenericGroupProps {
    kind: typeof GENERIC_CHANGE_KIND;
    text: string;
    timestamp?: number;
    controlId?: string;
    index: number;
    changes: (SavedGenericChange | PendingGenericChange)[];
}
/**
 * React Element for generic groups.
 *
 * @param genericGroupProps GenericGroupProps
 * @returns ReactElement
 */
export function GenericGroup(genericGroupProps: Readonly<GenericGroupProps>): ReactElement {
    const { text, changes, controlId } = genericGroupProps;
    const dispatch = useDispatch();
    const stackName = changes[0].type === SAVED_CHANGE_TYPE ? `saved-changes-stack` : `unsaved-changes-stack`;
    return (
        <Stack>
            <Stack.Item className={styles.header}>
                {controlId ? (
                    <Link
                        className={styles.textHeader}
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
                ) : (
                    <Text
                        style={{
                            color: 'var(--vscode-foreground)',
                            fontSize: '13px',
                            fontWeight: 'bold',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                            overflowX: 'hidden',
                            lineHeight: '18px'
                        }}>
                        {text}
                    </Text>
                )}
            </Stack.Item>
            {changes.map((change, i) => {
                const key = `${text}-${i}`;
                return (
                    <Stack.Item
                        data-testid={`${stackName}-${text}-${change.fileName}`}
                        key={String(change.fileName ?? '') + i}
                        className={styles.item}>
                        <GenericChange key={key} change={change} actionClassName={styles.actions} />
                    </Stack.Item>
                );
            })}
        </Stack>
    );
}
