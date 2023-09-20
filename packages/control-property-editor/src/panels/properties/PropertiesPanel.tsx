import type { ReactElement } from 'react';
import React from 'react';

import { PropertiesList } from './PropertiesList';
import { Separator, ThemeSelectorCallout, Toolbar } from '../../components';
import { ViewChanger } from './ViewChanger';
import { DeviceSelector } from './DeviceSelector';

/**
 * Main function to render the properties panel.
 *
 * @returns Properties panel as ReactElement
 */
export function PropertiesPanel(): ReactElement {
    return (
        <>
            <Toolbar
                left={
                    <>
                        <ThemeSelectorCallout />
                        <Separator direction="vertical" style={{ marginLeft: '10px', marginRight: '10px' }} />
                        <ViewChanger />
                    </>
                }
                right={<DeviceSelector />}
            />
            <PropertiesList />
        </>
    );
}
