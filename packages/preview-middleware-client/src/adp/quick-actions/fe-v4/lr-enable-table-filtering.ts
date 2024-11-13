import FlexCommand from 'sap/ui/rta/command/FlexCommand';
import CommandFactory from 'sap/ui/rta/command/CommandFactory';
import OverlayRegistry from 'sap/ui/dt/OverlayRegistry';

import {
    NestedQuickActionDefinition,
    QuickActionContext,
    SimpleQuickActionDefinition
} from '../../../cpe/quick-actions/quick-action-definition';
import { getControlById } from '../../../utils/core';
import { getReference } from './utils';
import { SimpleQuickActionDefinitionBase } from '../simple-quick-action-base';
import UI5Element from 'sap/ui/core/Element';
import Table from 'sap/ui/mdc/Table';
import { TableQuickActionDefinitionBase } from './table-quick-action-base';
import { getRelevantControlFromActivePage } from '../../../cpe/quick-actions/utils';

export const ENABLE_TABLE_FILTERING = 'enable-table-filtering';
const CONTROL_TYPE = 'sap.ui.mdc.Table';

/**
 * Quick Action for toggling the visibility of "clear filter bar" button in List Report page.
 */
export class EnableTableFilteringQuickAction
    extends TableQuickActionDefinitionBase
    implements NestedQuickActionDefinition
{
    constructor(context: QuickActionContext) {
        super(ENABLE_TABLE_FILTERING, 'QUICK_ACTION_ENABLE_TABLE_FILTERING', context);
    }
    readonly forceRefreshAfterExecution = true;

    private getModifiedControl(): UI5Element | undefined {
        const controls = this.context.controlIndex[CONTROL_TYPE] ?? [];
        const control = controls[0];
        if (control) {
            return getControlById(control.controlId);
        }
    }

    initialize(): Promise<void> {
        let index = 0;
        for (const smartTable of getRelevantControlFromActivePage(this.context.controlIndex, this.context.view, [
            CONTROL_TYPE
        ])) {
            const personalizationData = (smartTable as Table).getP13nMode();
            const isFilterEnabled = personalizationData.includes('Filter');

            this.children.push({
                label: `'${(smartTable as Table).getHeader()}' table`,
                enabled: !isFilterEnabled,
                tooltip: isFilterEnabled ? 'Filter already enabled' : undefined,
                children: []
            });
            this.tableMap[`${this.children.length - 1}`] = index;
            index++;
        }

        if (this.children.length > 0) {
            this.isApplicable = true;
        }
        if (this.children.every((child) => !child.enabled)) {
            this.isDisabled = true;
        }
        return Promise.resolve();
    }

    // const modifiedControl = this.getModifiedControl();
    // if (!modifiedControl) {
    //     return;
    // }
    // const personalizationData = (modifiedControl as Table).getP13nMode();
    // const isFilterEnabled = personalizationData.includes('Filter');
    // this.control = isFilterEnabled ? undefined : modifiedControl;

    async execute(path: string): Promise<FlexCommand[]> {
        const { flexSettings, rta } = this.context;
        const index = this.tableMap[path];

        const smartTables = getRelevantControlFromActivePage(this.context.controlIndex, this.context.view, [
            CONTROL_TYPE
        ]);

        const modifiedControl = smartTables[index];
        if (!modifiedControl) {
            return [];
        }

        const overlay = OverlayRegistry.getOverlay(modifiedControl);
        if (!overlay) {
            return [];
        }
        const overlayData = overlay?.getDesignTimeMetadata().getData();
        const manifestPropertyPath = (overlayData as any).manifestPropertyPath(modifiedControl);
        const [manifestPropertyChange] = (overlayData as any).manifestPropertyChange(
            {
                personalization: {
                    sort: true,
                    column: true,
                    filter: true,
                    group: true,
                    aggregate: true
                }
            },
            manifestPropertyPath,
            modifiedControl
        );

        const modifiedValue = {
            reference: getReference(modifiedControl),
            appComponent: manifestPropertyChange.appComponent,
            changeType: manifestPropertyChange.changeSpecificData.appDescriptorChangeType,
            parameters: manifestPropertyChange.changeSpecificData.content.parameters,
            selector: manifestPropertyChange.selector
        };

        const command = await CommandFactory.getCommandFor(
            modifiedControl,
            'appDescriptor',
            modifiedValue,
            null,
            flexSettings
        );

        return [command];
    }
}
