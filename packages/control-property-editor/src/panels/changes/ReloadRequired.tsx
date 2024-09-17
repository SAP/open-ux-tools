import type { ReactElement } from 'react';
import React from 'react';
import { Stack, Text } from '@fluentui/react';
import { useDispatch } from 'react-redux';
import { useTranslation } from 'react-i18next';

import { reloadApplication } from '@sap-ux-private/control-property-editor-common';

import styles from './FileChange.module.scss';
/**
 * React element for displaying message that some changes are not visible until reload.
 *
 * @returns ReactElement
 */
export function ReloadRequired(): ReactElement {
    const { t } = useTranslation();
    const dispatch = useDispatch();

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
                            <a href="#" className={styles.textLink} onClick={() => dispatch(reloadApplication())}>
                                {t('SAVE_AND_RELOAD')}
                            </a>
                        </Text>
                    </Stack.Item>
                </Stack>
            </Stack.Item>
        </Stack>
    );
}
