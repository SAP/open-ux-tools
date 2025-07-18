import type { ReactElement } from 'react';
import React from 'react';

import { UISectionLayout, UISections, UISplitterLayoutType, UISplitterType } from '@sap-ux/ui-components';

import { ChangesPanel } from './changes';
import { OutlinePanel } from './outline';

import './LeftPanel.scss';

/**
 * React element for left panel containing outline and change stack.
 *
 * @returns ReactElement
 */
export function LeftPanel(): ReactElement {
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
                scrollable={false}
                layout={UISectionLayout.Standard}
                className="editor__outline"
                height="100%">
                <OutlinePanel />
            </UISections.Section>
            <UISections.Section
                scrollable={false}
                layout={UISectionLayout.Standard}
                className="editor__outline"
                height="100%"
                cleanPadding={true}>
                <ChangesPanel />
            </UISections.Section>
        </UISections>
    );
}
