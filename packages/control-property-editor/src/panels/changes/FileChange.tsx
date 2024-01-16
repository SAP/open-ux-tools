import type { ReactElement } from 'react';
import React from 'react';
import { Stack, Text } from '@fluentui/react';
import styles from './FileChange.module.scss';
import { useDispatch } from 'react-redux';
import { reloadApplication } from '@sap-ux-private/control-property-editor-common';
interface FileChangeProps {
    fileName: string;
    hasUnsavedChanges: boolean;
}

/**
 * React element for Other change.
 *
 * @param FileChangeProps FileChangeProps
 * @param FileChangeProps.fileName
 * @param FileChangeProps.hasUnsavedChanges
 * @returns ReactElement
 */
export function FileChange({ fileName, hasUnsavedChanges }: Readonly<FileChangeProps>): ReactElement {
    const dispatch = useDispatch();
    function handleSaveAndReload() {
        if (fileName) {
            dispatch(reloadApplication(fileName)); // dispatch your action here
        }
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
                            {fileName ? (
                                <a href="#" className={styles.textLink} onClick={handleSaveAndReload}>
                                    {hasUnsavedChanges ? 'Save and Reload' : 'Save'}
                                </a>
                            ) : (
                                ''
                            )}{' '}
                            the editor to show those changes
                        </Text>
                    </Stack.Item>
                </Stack>
            </Stack.Item>
        </Stack>
    );
}
