import type { ReactElement } from 'react';
import React from 'react';

import { UISectionLayout, UISections, UISplitterLayoutType, UISplitterType } from '@sap-ux/ui-components';

import { PropertiesList } from './properties';
import { QuickActionList } from './quick-actions';

/**
 * React element for right panel containing quick actions and properties.
 *
 * @returns ReactElement
 */
export function RightPanel(): ReactElement {
    return (
        <UISections
            vertical={true}
            splitter={true}
            height="100%"
            splitterType={UISplitterType.Resize}
            splitterLayoutType={UISplitterLayoutType.Compact}
            minSectionSize={[300, 190]}
            sizes={[60, 40]}
            sizesAsPercents={true}
            animation={true}>
            <UISections.Section
                scrollable={true}
                layout={UISectionLayout.Standard}
                className="editor__outline"
                height="100%">
                <QuickActionList />
            </UISections.Section>
            <UISections.Section
                layout={UISectionLayout.Standard}
                className="editor__outline"
                height="100%"
                cleanPadding={true}>
                <PropertiesList />
            </UISections.Section>
        </UISections>
    );
}
