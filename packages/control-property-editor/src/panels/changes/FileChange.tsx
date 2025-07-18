import type { ReactElement } from 'react';
import React from 'react';
import { Stack, Text } from '@fluentui/react';
import styles from './FileChange.module.scss';
import { useDispatch } from 'react-redux';
import { reloadApplication } from '@sap-ux-private/control-property-editor-common';
import { useTranslation } from 'react-i18next';
interface FileChangeProps {
    hasUnsavedChanges: boolean;
}

/**
 * React element for Other change.
 *
 * @param FileChangeProps - FileChangeProps.
 * @param FileChangeProps.hasUnsavedChanges - Flag if there are unsaved changes.
 * @returns ReactElement
 */
export function FileChange({ hasUnsavedChanges }: Readonly<FileChangeProps>): ReactElement {
    const { t } = useTranslation();
    const dispatch = useDispatch();

    function handleSaveAndReload(): void {
        dispatch(
            reloadApplication({
                save: hasUnsavedChanges
            })
        );
    }

    return (
        <Stack
            tokens={{
                childrenGap: 5
            }}
            className={styles.container}>
            <Stack.Item className={styles.changeType}>
                <Stack
                    horizontal
                    horizontalAlign={'space-between'}
                    tokens={{
                        childrenGap: 5
                    }}>
                    <Stack.Item>
                        <Text className={styles.text}>
                            <a href="#" className={styles.textLink} onClick={handleSaveAndReload}>
                                {t(hasUnsavedChanges ? 'SAVE_AND_RELOAD' : 'RELOAD')}
                            </a>
                            <span>{t('SHOW_CHANGES')}</span>
                        </Text>
                    </Stack.Item>
                </Stack>
            </Stack.Item>
        </Stack>
    );
}
