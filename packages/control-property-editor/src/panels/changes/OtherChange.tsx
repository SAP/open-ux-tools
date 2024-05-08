import type { ReactElement } from 'react';
import React from 'react';

import { Stack, Text } from '@fluentui/react';
import { convertCamelCaseToPascalCase } from '@sap-ux-private/control-property-editor-common';

import styles from './OtherChange.module.scss';
import type { ChangeProps } from './ChangesPanel';

/**
 * React element for Other change.
 *
 * @param OtherChangeProps OtherChangeProps
 * @returns ReactElement
 */
export function OtherChange(OtherChangeProps: Readonly<ChangeProps>): ReactElement {
    const { changeType, isActive } = OtherChangeProps;
    return (
        <Stack
            tokens={{
                childrenGap: 5
            }}
            className={styles.container}
            style={{
                opacity: isActive ? 1 : 0.4
            }}>
            <Stack.Item className={styles.changeType}>
                <Stack
                    horizontal
                    horizontalAlign={'space-between'}
                    tokens={{
                        childrenGap: 5
                    }}>
                    <Stack.Item>
                        <Text className={styles.text}>{convertCamelCaseToPascalCase(changeType)}</Text>
                    </Stack.Item>
                </Stack>
            </Stack.Item>
        </Stack>
    );
}
