import type { ReactElement } from 'react';
import React from 'react';

import { Stack, Text } from '@fluentui/react';
import type { PendingOtherChange, UnknownSavedChange } from '@sap-ux-private/control-property-editor-common';
import { convertCamelCaseToPascalCase, SAVED_CHANGE_TYPE } from '@sap-ux-private/control-property-editor-common';

import styles from './OtherChange.module.scss';

export interface OtherChangeProps {
    /**
     * Class used for showing and hiding actions
     */
    actionClassName: string;
    change: PendingOtherChange | UnknownSavedChange;
}

/**
 * React element for Other change.
 *
 * @param props OtherChangeProps
 * @returns ReactElement
 */
export function OtherChange(props: Readonly<OtherChangeProps>): ReactElement {
    const { change } = props;
    return (
        <Stack
            tokens={{
                childrenGap: 5
            }}
            className={styles.container}
            style={{
                opacity: change.type === SAVED_CHANGE_TYPE || change.isActive ? 1 : 0.4
            }}>
            <Stack.Item className={styles.changeType}>
                <Stack
                    horizontal
                    horizontalAlign={'space-between'}
                    tokens={{
                        childrenGap: 5
                    }}>
                    <Stack.Item>
                        <Text className={styles.text}>{convertCamelCaseToPascalCase(change.changeType)}</Text>
                    </Stack.Item>
                </Stack>
            </Stack.Item>
        </Stack>
    );
}
