import type { ReactElement } from 'react';
import React from 'react';

import { PropertiesList } from './PropertiesList';

/**
 * Main function to render the properties panel.
 *
 * @returns Properties panel as ReactElement
 */
export function PropertiesPanel(): ReactElement {
    return <PropertiesList />;
}
