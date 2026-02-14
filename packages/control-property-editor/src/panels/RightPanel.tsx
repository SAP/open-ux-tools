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

    const actionsRowHeight = 100;
    const header = 50;
    /**
     * The info center can accommodate at most {@link infoCenterMaxRowsCount} rows
     * with height of {@link infoCenterMaxRowHeight} each, initially.
     */
    const infoCenterMaxRowsCount = 3;
    // Each info center row item contains a title, description and actions(less/more, view details).
    // The descriotption can contain max 4 lines with ellipsis and if the text content is more we have a `more`
    // button to expand it. So the 130px seems to be the max height for each info center item when not expanded.
    const infoCenterMaxRowHeight = 130;

    const initialSizeQuickActions = actionsCount * actionsRowHeight + header;
    const initialSizeInfoCenter =
        Math.min(infoCenterMessagesCount, infoCenterMaxRowsCount) * infoCenterMaxRowHeight + header;

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
