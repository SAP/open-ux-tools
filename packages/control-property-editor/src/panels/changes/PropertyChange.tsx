import type { ReactElement } from 'react';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useDispatch } from 'react-redux';

import { Stack, StackItem, Text } from '@fluentui/react';
import { UIIcon, UIIconButton, UiIcons, UIDialog } from '@sap-ux/ui-components';

import type {
    PendingPropertyChange,
    PropertyChangeDeletionDetails,
    SavedPropertyChange
} from '@sap-ux-private/control-property-editor-common';
import {
    convertCamelCaseToPascalCase,
    deletePropertyChanges,
    SAVED_CHANGE_TYPE
} from '@sap-ux-private/control-property-editor-common';
import { IconName } from '../../icons';

import styles from './PropertyChange.module.scss';
import { getFormattedDateAndTime } from './utils';

export interface PropertyChangeProps {
    /**
     * Class used for showing and hiding actions
     */
    actionClassName: string;
    change: PendingPropertyChange | SavedPropertyChange;
}

/**
 * React element for property change.
 *
 * @param propertyChangeProps PropertyChangeProps
 * @returns ReactElement
 */
export function PropertyChange(propertyChangeProps: Readonly<PropertyChangeProps>): ReactElement {
    const { change, actionClassName } = propertyChangeProps;
    const { t } = useTranslation();
    const dispatch = useDispatch();
    const [dialogState, setDialogState] = useState<PropertyChangeDeletionDetails | undefined>(undefined);

    const valueIcon = getValueIcon(change.value);

    function onConfirmDelete(): void {
        if (dialogState) {
            dispatch(deletePropertyChanges(dialogState));
            setDialogState(undefined);
        }
    }

    function onCancelDelete(): void {
        setDialogState(undefined);
    }

    return (
        <>
            <Stack
                tokens={{
                    childrenGap: 5
                }}
                className={styles.container}
                style={{
                    opacity: change.type === SAVED_CHANGE_TYPE || change.isActive ? 1 : 0.4
                }}>
                <Stack.Item className={styles.property}>
                    <Stack
                        horizontal
                        horizontalAlign={'space-between'}
                        tokens={{
                            childrenGap: 5
                        }}>
                        <Stack.Item>
                            <Text className={styles.text}>{convertCamelCaseToPascalCase(change.propertyName)}</Text>
                            <UIIcon iconName={IconName.arrow} className={styles.text} />
                            {valueIcon && <UIIcon className={'ui-cpe-icon-light-theme'} iconName={valueIcon} />}
                            <Text className={styles.text}>{change.value}</Text>
                        </Stack.Item>
                        {change.type === SAVED_CHANGE_TYPE && (
                            <Stack.Item className={actionClassName}>
                                <UIIconButton
                                    iconProps={{ iconName: UiIcons.TrashCan }}
                                    onClick={(): void => {
                                        if (change.controlId) {
                                            setDialogState({
                                                controlId: change.controlId,
                                                propertyName: change.propertyName,
                                                fileName: change.fileName
                                            });
                                        }
                                    }}
                                />
                            </Stack.Item>
                        )}
                    </Stack>
                </Stack.Item>

                {change.type === SAVED_CHANGE_TYPE && (
                    <StackItem>
                        <Stack horizontal horizontalAlign="space-between">
                            <Text className={styles.timestamp}>{getFormattedDateAndTime(change.timestamp)}</Text>
                        </Stack>
                    </StackItem>
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

/**
 * Get value icon based on type.
 *
 * @param value string | number | boolean
 * @returns string | undefined
 */
function getValueIcon(value: string | number | boolean): string | undefined {
    if (typeof value === 'string') {
        if (value.trim().startsWith('{') && value.trim().endsWith('}')) {
            return IconName.expression;
        } else {
            return IconName.string;
        }
    } else if (typeof value === 'number') {
        return IconName.number;
    } else if (typeof value === 'boolean') {
        if (value === true) {
            return IconName.boolTrue;
        } else {
            return IconName.boolFalse;
        }
    }
    return undefined;
}
