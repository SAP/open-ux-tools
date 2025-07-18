import type { ReactElement } from 'react';
import React from 'react';

import { UIIcon } from '@sap-ux/ui-components';

import { IconName } from '../../icons';

import { getValueIcon } from './utils';
import styles from './DisplayAsIcon.module.scss';
import { convertCamelCaseToPascalCase } from '@sap-ux-private/control-property-editor-common';

export interface DisplayAsIconProps {
    label: string;
    value?: string | number | boolean;
}

/**
 * Check if given value is defined.
 *
 * @param value string | number | boolean | undefined
 *  @returns ReactElement
 */
function hasValue(value: string | number | boolean | undefined): value is string | number | boolean {
    return value != undefined && value !== null;
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
    const convertedLabel = convertCamelCaseToPascalCase(label);
    return (
        <>
            <span className={styles.label} title={convertedLabel}>
                {convertedLabel}
            </span>
            {hasValue(value) && (
                <UIIcon
                    style={{ paddingRight: '2px', paddingLeft: '2px', width: '16px', height: '16px' }}
                    iconName={IconName.arrow}
                    className={styles.text}
                />
            )}
            {valueIcon && (
                <UIIcon title={value?.toString()} className={'ui-cpe-icon-light-theme'} iconName={valueIcon} />
            )}
            {hasValue(value) && (
                <span className={styles.text} title={value.toString()}>
                    {value}
                </span>
            )}
        </>
    );
}
