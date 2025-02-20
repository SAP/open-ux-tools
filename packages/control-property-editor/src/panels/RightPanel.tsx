import type { ReactElement } from 'react';
import React from 'react';
import { useSelector } from 'react-redux';

import { UISectionLayout, UISections, UISplitterLayoutType, UISplitterType } from '@sap-ux/ui-components';
import type { Scenario } from '@sap-ux-private/control-property-editor-common';

import { PropertiesList } from './properties';
import { QuickActionList } from './quick-actions';
import { InfoCenter } from './info-center';
import type { RootState } from '../store';
import './RightPanel.scss';

/**
 * React element for right panel containing quick actions and properties.
 *
 * @returns ReactElement
 */
export function RightPanel(): ReactElement {
    const actionsCount = useSelector<RootState, number>((state) => state.quickActions.length);
    const scenario = useSelector<RootState, Scenario>((state) => state.scenario);
    const infoCenterMessagesCount = useSelector<RootState, number>((state) => state.infoCenterMessages.length);

    const rowSize = 100;
    const header = 50;
    const initialSizeQuickActions = actionsCount * rowSize + header;
    const initialSizeInfoCenter = infoCenterMessagesCount * rowSize + header;

    return (
        <UISections
            vertical={true}
            splitter={true}
            height="100%"
            splitterType={UISplitterType.Resize}
            splitterLayoutType={UISplitterLayoutType.Compact}
            minSectionSize={[0, 190, 0]}
            sizes={[initialSizeQuickActions, undefined, initialSizeInfoCenter]}
            sizesAsPercents={false}
            animation={true}>
            <UISections.Section
                hidden={scenario !== 'ADAPTATION_PROJECT' || actionsCount === 0}
                scrollable={true}
                layout={UISectionLayout.Standard}
                className="editor__quickactions"
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
            <UISections.Section
                hidden={infoCenterMessagesCount === 0}
                scrollable={true}
                layout={UISectionLayout.Standard}
                className="editor__infocenter"
                height="100%">
                <InfoCenter />
            </UISections.Section>
        </UISections>
    );
}
