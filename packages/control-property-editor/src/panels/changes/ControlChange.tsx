import type { ReactElement } from 'react';
import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Text, Stack, Link } from '@fluentui/react';
import { useDispatch } from 'react-redux';
import styles from './UnknownChange.module.scss';
import { UIIconButton, UiIcons, UIDialog } from '@sap-ux/ui-components';
import type {
    PropertyChangeDeletionDetails,
    PENDING_CHANGE_TYPE
} from '@sap-ux-private/control-property-editor-common';
import {
    SAVED_CHANGE_TYPE,
    convertCamelCaseToPascalCase,
    deletePropertyChanges,
    selectControl
} from '@sap-ux-private/control-property-editor-common';
import { getFormattedDateAndTime } from './utils';

export interface ControlItemProps {
    fileName: string;
    timestamp?: number;
    controlId: string;
    isActive: boolean;
    type: typeof SAVED_CHANGE_TYPE | typeof PENDING_CHANGE_TYPE;
    title?: string;
}

/**
 * React element for control change in the change stack.
 *
 * @param {Readonly<ControlItemProps>} props - The props object.
 * @param {string} props.controlId - The ID of the control being changed.
 * @param {string} props.fileName - The name of the file associated with the change.
 * @param {number} [props.timestamp] - The timestamp of the change, optional.
 * @param {string} props.type - The type of the change (e.g., 'saved' | 'pending').
 * @param {string} props.isActive - Indicates if change is before or after current position in undo redo stack.
 * @returns {ReactElement} A React element that renders the control change UI.
 */
export function ControlChange({
    controlId,
    fileName,
    timestamp,
    type,
    isActive,
    title
}: Readonly<ControlItemProps>): ReactElement {
    const { t } = useTranslation();
    const dispatch = useDispatch();
    const [dialogState, setDialogState] = useState<PropertyChangeDeletionDetails | undefined>(undefined);

    const name = useMemo(() => {
        const parts = fileName.split('_');
        const changeName = parts[parts.length - 1];
        return convertCamelCaseToPascalCase(changeName);
    }, [fileName]);

    const onConfirmDelete = (): void => {
        if (dialogState) {
            dispatch(deletePropertyChanges(dialogState));
            setDialogState(undefined);
        }
    };

    const onCancelDelete = (): void => {
        setDialogState(undefined);
    };
    const headerTitle = title ?? `${name} ${t('CHANGE')}`;
    return (
        <>
            <Stack className={styles.item}>
                <Stack.Item className={styles.property}>
                    <Stack horizontal>
                        <Stack.Item>
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
                                {headerTitle}
                            </Link>

                            <Stack horizontal style={{ opacity: isActive ? 1 : 0.4 }}>
                                <Stack.Item className={styles.fileLabel}>{t('FILE')}</Stack.Item>
                                <Stack.Item className={styles.fileText} title={fileName}>
                                    {fileName}
                                </Stack.Item>
                            </Stack>
                            {controlId && (
                                <Stack horizontal style={{ opacity: isActive ? 1 : 0.4 }}>
                                    <Stack.Item className={styles.controlLabel}>{t('CONTROL')}</Stack.Item>
                                    <Stack.Item className={styles.controlText} title={controlId}>
                                        {controlId}
                                    </Stack.Item>
                                </Stack>
                            )}
                        </Stack.Item>

                        {type === SAVED_CHANGE_TYPE && (
                            <Stack.Item className={styles.actions}>
                                <UIIconButton
                                    iconProps={{ iconName: UiIcons.TrashCan }}
                                    onClick={(): void => {
                                        setDialogState({
                                            controlId: '',
                                            propertyName: '',
                                            fileName
                                        });
                                    }}
                                />
                            </Stack.Item>
                        )}
                    </Stack>
                </Stack.Item>
                {timestamp && (
                    <Stack.Item>
                        <Stack horizontal horizontalAlign="space-between">
                            <Text className={styles.timestamp}>{getFormattedDateAndTime(timestamp ?? 0)}</Text>
                        </Stack>
                    </Stack.Item>
                )}
            </Stack>

            {dialogState && (
                <UIDialog
                    hidden={dialogState === undefined}
                    onAccept={onConfirmDelete}
                    acceptButtonText={t('CONFIRM_DELETE')}
                    cancelButtonText={t('CANCEL_DELETE')}
                    onCancel={onCancelDelete}
                    dialogContentProps={{
                        title: t('CONFIRM_OTHER_CHANGE_DELETE_TITLE'),
                        subText: t('CONFIRM_OTHER_CHANGE_DELETE_SUBTEXT', { name })
                    }}
                />
            )}
        </>
    );
}
