import type { ReactElement } from 'react';
import React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import type { AnyAction } from 'redux';
import { UIIconButton } from '@sap-ux/ui-components';

import type { DeviceType } from '../devices';
import { changeDeviceType } from '../slice';
import type { RootState } from '../store';

export interface DeviceToggleProps {
    deviceType: DeviceType;
    tooltip: string;
}

/**
 * React element for device toggle.
 *
 * @param deviceToggleProps DeviceToggleProps
 * @returns ReactElement
 */
export function DeviceToggle(deviceToggleProps: Readonly<DeviceToggleProps>): ReactElement {
    const { deviceType, tooltip } = deviceToggleProps;
    const dispatch = useDispatch();
    const selectedDeviceType = useSelector<RootState, DeviceType>((state) => state.deviceType);
    const checked = deviceType === selectedDeviceType;
    return (
        <UIIconButton
            id={`device-toggle-${deviceType}`}
            iconProps={{
                iconName: deviceType
            }}
            title={tooltip}
            toggle={true}
            checked={checked}
            onClick={(): AnyAction => dispatch(changeDeviceType(deviceType))}
        />
    );
}
