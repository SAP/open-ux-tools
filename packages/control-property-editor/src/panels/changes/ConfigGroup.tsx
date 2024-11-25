import type { ReactElement } from 'react';
import React from 'react';
import { Stack, Text } from '@fluentui/react';

import type {
    PendingConfigurationChange,
    SavedConfigurationChange
} from '@sap-ux-private/control-property-editor-common';
import { SAVED_CHANGE_TYPE } from '@sap-ux-private/control-property-editor-common';

import styles from './ControlGroup.module.scss';
import { ConfigChange as ConfigurationChange } from './ConfigChange';

export interface ConfigGroupProps {
    text: string;
    configPath: string;
    index: number;
    changes: (PendingConfigurationChange | SavedConfigurationChange)[];
}

/**
 * React Element for config groups.
 *
 * @param configGroupProps ConfigGroupProps
 * @returns ReactElement
 */
export function ConifgGroup(configGroupProps: Readonly<ConfigGroupProps>): ReactElement {
    const { text, configPath, changes } = configGroupProps;
    const stackName = changes[0].type === SAVED_CHANGE_TYPE ? `saved-changes-stack` : `unsaved-changes-stack`;
    return (
        <Stack>
            <Stack.Item className={styles.header}>
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
            </Stack.Item>
            <Stack.Item className={styles.subHeader}>
                <Text
                    style={{
                        color: 'var(--vscode-foreground)',
                        fontSize: '11px',
                        fontWeight: 'bolder',
                        lineHeight: '22px'
                    }}
                    title={configPath}>
                    {configPath}
                </Text>
            </Stack.Item>
            {changes.map((change) => {
                return (
                    <Stack.Item
                        data-testid={`${stackName}-${text}-${change.propertyName}-${change.fileName}`}
                        key={change.fileName}
                        className={styles.item}>
                        <ConfigurationChange change={change} actionClassName={styles.actions} />
                    </Stack.Item>
                );
            })}
        </Stack>
    );
}
