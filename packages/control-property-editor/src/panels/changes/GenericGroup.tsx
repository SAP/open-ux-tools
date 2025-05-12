import type { ReactElement } from 'react';
import React from 'react';
import { Link, Stack } from '@fluentui/react';

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
    subtitle?: string;
    changes: (SavedGenericChange | PendingGenericChange)[];
}
/**
 * React Element for generic groups.
 *
 * @param genericGroupProps GenericGroupProps
 * @returns ReactElement
 */
export function GenericGroup(genericGroupProps: Readonly<GenericGroupProps>): ReactElement {
    const { text, changes, controlId, subtitle } = genericGroupProps;
    const dispatch = useDispatch();
    const stackName = changes[0].type === SAVED_CHANGE_TYPE ? `saved-changes-stack` : `unsaved-changes-stack`;
    return (
        <Stack>
            <Stack.Item className={styles.header}>
                {typeof controlId === 'string' ? (
                    <Link
                        className={styles.textHeader}
                        onClick={(): void => {
                            const action = selectControl(controlId);
                            dispatch(action);
                        }}
                        style={{
                            color: 'var(--vscode-textLink-foreground)'
                        }}>
                        {text}
                    </Link>
                ) : (
                    <span
                        className={styles.textHeader}
                        style={{
                            color: 'var(--vscode-foreground)'
                        }}>
                        {text}
                    </span>
                )}
            </Stack.Item>
            {subtitle && (
                <Stack.Item className={styles.subHeader}>
                    <span className={styles.subText} title={subtitle}>
                        {subtitle}
                    </span>
                </Stack.Item>
            )}
            {changes.map((change, i) => {
                const key = `${text}-${i}`;
                return (
                    <Stack.Item
                        data-testid={`${stackName}-${controlId}-${
                            change.changeType === 'property' ? change.properties[0].label : change.changeType
                        }-${change.fileName}`}
                        key={String(change.fileName ?? '') + i}
                        className={styles.item}>
                        <GenericChange key={key} change={change} actionClassName={styles.actions} />
                    </Stack.Item>
                );
            })}
        </Stack>
    );
}
