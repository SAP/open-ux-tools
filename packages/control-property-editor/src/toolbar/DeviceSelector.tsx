import type { ReactElement } from 'react';
import React from 'react';
import { useTranslation } from 'react-i18next';

import { DeviceType } from '../devices';

import type { DeviceToggleProps } from './DeviceToggle';
import { DeviceToggle } from './DeviceToggle';

/**
 * React element for Device Selector.
 *
 * @returns ReactElement
 */
export function DeviceSelector(): ReactElement {
    const { t } = useTranslation();

    const deviceProps: DeviceToggleProps[] = [
        {
            deviceType: DeviceType.Desktop,
            tooltip: t('DEVICE_TYPE_DESKTOP')
        },
        {
            deviceType: DeviceType.Tablet,
            tooltip: t('DEVICE_TYPE_TABLET')
        },
        {
            deviceType: DeviceType.Phone,
            tooltip: t('DEVICE_TYPE_PHONE')
        }
    ];

    return (
        <>
            {deviceProps.map((props: DeviceToggleProps) => (
                <DeviceToggle key={props.deviceType} {...props} />
            ))}
        </>
    );
}
