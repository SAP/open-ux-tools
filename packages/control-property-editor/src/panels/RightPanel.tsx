import type { ReactElement } from 'react';
import React from 'react';

import { UISectionLayout, UISections, UISplitterLayoutType, UISplitterType } from '@sap-ux/ui-components';

import { PropertiesList } from './properties';
import { QuickActionList } from './quick-actions';
import { useSelector } from 'react-redux';
import { RootState } from '../store';
import './RightPanel.scss';

/**
 * React element for right panel containing quick actions and properties.
 *
 * @returns ReactElement
 */
export function RightPanel(): ReactElement {
    const rowSize = 100;
    const header = 150;
    const actionsCount = useSelector<RootState, number>((state) => state.quickActions.length);
    const initialSize = actionsCount * rowSize + header;
    return (
        <UISections
            vertical={true}
            splitter={true}
            height="100%"
            splitterType={UISplitterType.Resize}
            splitterLayoutType={UISplitterLayoutType.Compact}
            minSectionSize={[0, 190]}
            sizes={[initialSize, undefined]}
            sizesAsPercents={false}
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
                className="editor__properties"
                height="100%"
                cleanPadding={true}>
                <PropertiesList />
            </UISections.Section>
        </UISections>
    );
}
