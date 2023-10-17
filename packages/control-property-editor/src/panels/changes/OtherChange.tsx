import type { ReactElement } from 'react';
import React from 'react';

import { Stack, Text } from '@fluentui/react';
import { convertCamelCaseToPascalCase } from '@sap-ux-private/control-property-editor-common';

import styles from './OtherChange.module.scss';

export interface OtherChangeProps {
    changeType: string;
    isActive: boolean;
    controlId: string;
    controlName: string;
}

/**
 * React element for Other change.
 *
 * @param OtherChangeProps OtherChangeProps
 * @returns ReactElement
 */
export function OtherChange(OtherChangeProps: OtherChangeProps): ReactElement {
    const { changeType, isActive } = OtherChangeProps;
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
        </>
    );
}
