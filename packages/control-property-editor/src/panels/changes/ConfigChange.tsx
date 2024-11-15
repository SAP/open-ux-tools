import type { ReactElement } from 'react';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Text, Stack, StackItem } from '@fluentui/react';
import { useDispatch } from 'react-redux';
import styles from './ConfigChange.module.scss';
import { UIIconButton, UiIcons, UIDialog, UIIcon } from '@sap-ux/ui-components';
import type {
    PendingConfigurationChange,
    PropertyChangeDeletionDetails,
    SavedConfigurationChange
} from '@sap-ux-private/control-property-editor-common';
import {
    deletePropertyChanges,
    convertCamelCaseToPascalCase,
    SAVED_CHANGE_TYPE
} from '@sap-ux-private/control-property-editor-common';
import { getFormattedDateAndTime, getValueIcon } from './utils';
import { IconName } from '../../icons';

export interface ConfigChangeProps {
    /**
     * Class used for showing and hiding actions
     */
    actionClassName?: string;
    change: PendingConfigurationChange | SavedConfigurationChange;
}

/**
 * React element for config change in change stack.
 *
 * @param configChangeProps ConfigChangeProps
 * @returns ReactElement
 */
export function ConfigChange(configChangeProps: Readonly<ConfigChangeProps>): ReactElement {
    const { change, actionClassName } = configChangeProps;
    const { value, propertyName } = change;
    const { t } = useTranslation();
    const dispatch = useDispatch();
    const [dialogState, setDialogState] = useState<PropertyChangeDeletionDetails | undefined>(undefined);
    const isPrimitiveValue = typeof value !== 'object';
    const valueIcon = isPrimitiveValue ? getValueIcon(value) : undefined;
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
                        <Stack.Item className={styles.item}>
                            <Text className={styles.text} title={propertyName}>
                                {convertCamelCaseToPascalCase(propertyName)}
                            </Text>
                            {isPrimitiveValue && valueIcon && (
                                <>
                                    <UIIcon iconName={IconName.arrow} className={styles.text} />
                                    <UIIcon className={'ui-cpe-icon-light-theme'} iconName={valueIcon} />
                                    <Text className={styles.text}>{value}</Text>
                                </>
                            )}
                        </Stack.Item>
                        {change.type === SAVED_CHANGE_TYPE && (
                            <Stack.Item className={actionClassName}>
                                <UIIconButton
                                    iconProps={{ iconName: UiIcons.TrashCan }}
                                    onClick={(): void => {
                                        setDialogState({
                                            controlId: '',
                                            propertyName: '',
                                            fileName: change.fileName
                                        });
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
