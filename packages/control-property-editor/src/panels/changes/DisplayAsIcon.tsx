import type { ReactElement } from 'react';
import React from 'react';

import { Text } from '@fluentui/react';
import { UIIcon } from '@sap-ux/ui-components';

import { IconName } from '../../icons';

import { getValueIcon } from './utils';
import styles from './GenericChange.module.scss';
import { convertCamelCaseToPascalCase } from '@sap-ux-private/control-property-editor-common';

export interface DisplayAsIconProps {
    label: string;
    value: string | number | boolean | object;
}

/**
 * React element for property change.
 *
 * @param props DisplayAsIconProps
 * @returns ReactElement
 */
export function DisplayAsIcon(props: Readonly<DisplayAsIconProps>): ReactElement {
    const { label, value } = props;
    const valueIcon = getValueIcon(value);
    return (
        <>
            <Text className={styles.label}>{convertCamelCaseToPascalCase(label)}</Text>
            <UIIcon
                style={{ paddingRight: '2px', paddingLeft: '2px' }}
                iconName={IconName.arrow}
                className={styles.text}
            />
            {valueIcon && <UIIcon className={'ui-cpe-icon-light-theme'} iconName={valueIcon} />}
            <Text
                style={{
                    flex: '1 1 auto',
                    minWidth: '0px',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    direction: 'rtl',
                    textAlign: 'left'
                }}
                className={styles.text}>
                {typeof value === 'object' ? '[Object]' : value}
            </Text>
        </>
    );
}
