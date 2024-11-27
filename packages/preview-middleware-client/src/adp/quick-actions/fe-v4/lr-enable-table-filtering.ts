import FlexCommand from 'sap/ui/rta/command/FlexCommand';
import CommandFactory from 'sap/ui/rta/command/CommandFactory';
import OverlayRegistry from 'sap/ui/dt/OverlayRegistry';

import { NestedQuickActionDefinition, QuickActionContext } from '../../../cpe/quick-actions/quick-action-definition';
import Table from 'sap/ui/mdc/Table';
import { TableQuickActionDefinitionBase } from './table-quick-action-base';
import { getRelevantControlFromActivePage } from '../../../cpe/quick-actions/utils';
import { getReference } from '../../../utils/fe-v4';
import { getUi5Version, isLowerThanMinimalUi5Version } from '../../../utils/version';

export const ENABLE_TABLE_FILTERING = 'enable-table-filtering';
const CONTROL_TYPE = 'sap.ui.mdc.Table';

/**
 * Quick Action for enabling table filtering using table personalization settings.
 */
export class EnableTableFilteringQuickAction
    extends TableQuickActionDefinitionBase
    implements NestedQuickActionDefinition
{
    constructor(context: QuickActionContext) {
        super(ENABLE_TABLE_FILTERING, 'QUICK_ACTION_ENABLE_TABLE_FILTERING', context);
    }
    readonly forceRefreshAfterExecution = true;

    async initialize(): Promise<void> {
        const version = await getUi5Version();
        if (isLowerThanMinimalUi5Version(version, { major: 1, minor: 131 })) {
            this.isApplicable = false;
            return;
        }

        const tooltipText = this.context.resourceBundle.getText('THE_CHANGE_HAS_ALREADY_BEEN_MADE'); 
        let index = 0;
        for (const smartTable of getRelevantControlFromActivePage(this.context.controlIndex, this.context.view, [
            CONTROL_TYPE
        ])) {
            const personalizationData = (smartTable as Table).getP13nMode();
            const isFilterEnabled = personalizationData.includes('Filter');

            this.children.push({
                label: `'${(smartTable as Table).getHeader()}' table`,
                enabled: !isFilterEnabled,
                tooltip: isFilterEnabled ? tooltipText : undefined,
                children: []
            });
            this.tableMap[`${this.children.length - 1}`] = index;
            index++;
        }

        if (this.children.length > 0) {
            this.isApplicable = true;
        }
     
        return Promise.resolve();
    }

    async execute(path: string): Promise<FlexCommand[]> {
        const { flexSettings } = this.context;
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
        const manifestPropertyPath = overlayData.manifestPropertyPath(modifiedControl);
        const [manifestPropertyChange] = overlayData.manifestPropertyChange(
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
