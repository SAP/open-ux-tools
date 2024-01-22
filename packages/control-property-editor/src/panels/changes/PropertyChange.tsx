import type { ReactElement } from 'react';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useDispatch } from 'react-redux';

import { Stack, StackItem, Text } from '@fluentui/react';
import { UIIcon, UIIconButton, UiIcons, UIDialog } from '@sap-ux/ui-components';

import type { PropertyChangeDeletionDetails } from '@sap-ux-private/control-property-editor-common';
import { convertCamelCaseToPascalCase, deletePropertyChanges } from '@sap-ux-private/control-property-editor-common';
import { IconName } from '../../icons';

import styles from './PropertyChange.module.scss';
import { getFormattedDateAndTime } from './utils';
import type { ChangeProps } from './ChangesPanel';

/**
 * React element for property change.
 *
 * @param propertyChangeProps PropertyChangeProps
 * @returns ReactElement
 */
export function PropertyChange(propertyChangeProps: Readonly<ChangeProps>): ReactElement {
    const { controlId, propertyName, value, isActive, timestamp, fileName, actionClassName } = propertyChangeProps;
    const { t } = useTranslation();
    const dispatch = useDispatch();
    const [dialogState, setDialogState] = useState<PropertyChangeDeletionDetails | undefined>(undefined);

    const valueIcon = getValueIcon(value);

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
                    opacity: isActive ? 1 : 0.4
                }}>
                <Stack.Item className={styles.property}>
                    <Stack
                        horizontal
                        horizontalAlign={'space-between'}
                        tokens={{
                            childrenGap: 5
                        }}>
                        <Stack.Item>
                            <Text className={styles.text}>{convertCamelCaseToPascalCase(propertyName)}</Text>
                            <UIIcon iconName={IconName.arrow} className={styles.text} />
                            {valueIcon && <UIIcon className={'ui-cpe-icon-light-theme'} iconName={valueIcon} />}
                            <Text className={styles.text}>{value}</Text>
                        </Stack.Item>
                        {fileName && (
                            <Stack.Item className={actionClassName}>
                                <UIIconButton
                                    iconProps={{ iconName: UiIcons.TrashCan }}
                                    onClick={(): void => {
                                        if (controlId) {
                                            setDialogState({
                                                controlId,
                                                propertyName,
                                                fileName
                                            });
                                        }
                                    }}
                                />
                            </Stack.Item>
                        )}
                    </Stack>
                </Stack.Item>

                {timestamp && (
                    <StackItem>
                        <Stack horizontal horizontalAlign="space-between">
                            <Text className={styles.timestamp}>{getFormattedDateAndTime(timestamp)}</Text>
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
