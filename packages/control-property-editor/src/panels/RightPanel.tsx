import type { ReactElement } from 'react';
import React from 'react';

import { UISectionLayout, UISections, UISplitterLayoutType, UISplitterType } from '@sap-ux/ui-components';

import { PropertiesList } from './properties';
import { QuickActionList } from './quick-actions';
import { InfoCenter } from './info-center';
import { useSelector } from 'react-redux';
import { RootState } from '../store';
import './RightPanel.scss';

/**
 * React element for right panel containing quick actions and properties.
 *
 * @returns ReactElement
 */
export function RightPanel(): ReactElement {
    const rowSize = 50;
    const header = 150;
    const actionsCount = useSelector<RootState, number>((state) => state.quickActions.length);
    const infoCenterMessagesCount = useSelector<RootState, number>((state) => state.infoCenter.length);
    const initialSizeQuickActions = actionsCount * rowSize + header;
    const initialSizeInfoCenter = infoCenterMessagesCount * rowSize + header;
    return (
        <UISections
            vertical={true}
            splitter={true}
            height="100%"
            splitterType={UISplitterType.Resize}
            splitterLayoutType={UISplitterLayoutType.Compact}
            minSectionSize={[0, 190]}
            sizesAsPercents={false}
            animation={true}
            sizes={[initialSizeQuickActions, undefined, initialSizeInfoCenter]}>
            <UISections.Section
                scrollable={true}
                layout={UISectionLayout.Standard}
                className="editor__outline"
                height="100%"
                cleanPadding={true}>
                <QuickActionList />
            </UISections.Section>
            <UISections.Section
                layout={UISectionLayout.Standard}
                className="editor__properties"
                height="100%"
                cleanPadding={true}>
                <PropertiesList />
            </UISections.Section>
            <UISections.Section
                scrollable={true}
                layout={UISectionLayout.Standard}
                className="editor__outline"
                height="100%"
                cleanPadding={true}>
                <InfoCenter />
            </UISections.Section>
        </UISections>
    );
}
