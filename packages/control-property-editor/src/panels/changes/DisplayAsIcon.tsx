import type { ReactElement } from 'react';
import React from 'react';

import { UIIcon } from '@sap-ux/ui-components';

import { IconName } from '../../icons';

import { getValueIcon } from './utils';
import styles from './DisplayAsIcon.module.scss';
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
            <span className={styles.label}>{convertCamelCaseToPascalCase(label)}</span>
            <UIIcon
                style={{ paddingRight: '2px', paddingLeft: '2px', width: '16px', height: '16px' }}
                iconName={IconName.arrow}
                className={styles.text}
            />
            {valueIcon && <UIIcon className={'ui-cpe-icon-light-theme'} iconName={valueIcon} />}
            <span className={styles.text}>{typeof value === 'object' ? '[Object]' : value}</span>
        </>
    );
}
