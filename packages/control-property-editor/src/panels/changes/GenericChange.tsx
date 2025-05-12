import type { ReactElement } from 'react';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Text, Stack } from '@fluentui/react';
import { useDispatch } from 'react-redux';
import styles from './GenericChange.module.scss';
import { UIDialog, UIIconButton, UiIcons } from '@sap-ux/ui-components';
import type {
    PendingGenericChange,
    PropertyChangeDeletionDetails,
    SavedGenericChange
} from '@sap-ux-private/control-property-editor-common';
import {
    deletePropertyChanges,
    PENDING_CHANGE_TYPE,
    SAVED_CHANGE_TYPE
} from '@sap-ux-private/control-property-editor-common';
import { getFormattedDateAndTime } from './utils';
import GenericProperty from './GenericProperty';
import { DisplayAsIcon } from './DisplayAsIcon';

export interface GenericChangeProps {
    /**
     * Class used for showing and hiding actions
     */
    actionClassName?: string;
    change: SavedGenericChange | PendingGenericChange;
}

/**
 * React element for generic change in change stack.
 *
 * @param genericChangeProps GenericChangeProps
 * @returns ReactElement
 */
export function GenericChange(genericChangeProps: Readonly<GenericChangeProps>): ReactElement {
    const { change } = genericChangeProps;
    const { fileName, properties } = change;
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
    const key =
        change.type === SAVED_CHANGE_TYPE ? `${SAVED_CHANGE_TYPE}${fileName}` : `${PENDING_CHANGE_TYPE}${fileName}`;
    const name = `${t('FILE')}${fileName}`;
    const opacity =
        change.type === SAVED_CHANGE_TYPE || (change.type === PENDING_CHANGE_TYPE && change.isActive) ? 1 : 0.4;
    return (
        <>
            <Stack data-testid={'generic-change'} key={`${fileName}`} style={{ opacity }} className={styles.item}>
                <Stack.Item className={styles.property}>
                    <Stack horizontal>
                        <Stack.Item>
                            {properties.map((item, index) => {
                                const { label, value, displayValueWithIcon } = item;
                                return (
                                    <div
                                        key={`${key}${index}`}
                                        style={{
                                            display: 'flex',
                                            width: '240px',
                                            margin: '3px',
                                            alignItems: 'center',
                                            ...(!displayValueWithIcon && {
                                                alignItems: 'flex-start',
                                                flexDirection: 'column'
                                            }),
                                            flexWrap: 'wrap'
                                        }}>
                                        {displayValueWithIcon ? (
                                            <DisplayAsIcon label={label} value={value} />
                                        ) : (
                                            <GenericProperty label={label} value={value} />
                                        )}
                                    </div>
                                );
                            })}
                        </Stack.Item>
                        {change.type === SAVED_CHANGE_TYPE && (
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
                {change.type === SAVED_CHANGE_TYPE && change.timestamp && (
                    <Stack.Item>
                        <Stack horizontal horizontalAlign="space-between">
                            <Text className={styles.timestamp}>{getFormattedDateAndTime(change.timestamp)}</Text>
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
