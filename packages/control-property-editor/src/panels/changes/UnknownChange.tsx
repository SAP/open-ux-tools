import type { ReactElement } from 'react';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Text, Stack } from '@fluentui/react';
import { useDispatch } from 'react-redux';
import styles from './UnknownChange.module.scss';
import { UIIconButton, UiIcons, UIDialog } from '@sap-ux/ui-components';
import type { PropertyChangeDeletionDetails } from '@sap-ux-private/control-property-editor-common';
import { deletePropertyChanges, convertCamelCaseToPascalCase } from '@sap-ux-private/control-property-editor-common';
import { getFormattedDateAndTime } from './utils';

export interface UnknownChangeProps {
    fileName: string;
    timestamp?: number;
}

/**
 * React element for unknown change in change stack.
 *
 * @param unknownChangeProps UnknownChangeProps
 * @returns ReactElement
 */
export function UnknownChange(unknownChangeProps: UnknownChangeProps): ReactElement {
    const { fileName, timestamp } = unknownChangeProps;
    const { t } = useTranslation();
    const dispatch = useDispatch();
    const [dialogState, setDialogState] = useState<PropertyChangeDeletionDetails | undefined>(undefined);

    function onConfirmDelete(): void {
        if (dialogState) {
            dispatch(deletePropertyChanges(dialogState));
            setDialogState(undefined);
        }
    }

    function onCancelDelete(): void {
        setDialogState(undefined);
    }

    const parts = fileName.split('_');
    const changeName = parts[parts.length - 1];
    const name = convertCamelCaseToPascalCase(changeName);
    return (
        <>
            <Stack className={styles.item}>
                <Stack.Item className={styles.property}>
                    <Stack horizontal>
                        <Stack.Item>
                            <Text className={styles.textHeader}>
                                {name} {t('CHANGE')}
                            </Text>
                            <Text className={styles.text} title={fileName}>
                                {t('FILE')}
                                {fileName}
                            </Text>
                        </Stack.Item>
                        {fileName && (
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
                            <Text className={styles.timestamp}>{getFormattedDateAndTime(timestamp)}</Text>
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
                        title: t('CONFIRM_DELETE_TITLE'),
                        subText: t('CONFIRM_CHANGE_SUMMARY_DELETE_SUBTEXT')
                    }}
                />
            )}
        </>
    );
}
