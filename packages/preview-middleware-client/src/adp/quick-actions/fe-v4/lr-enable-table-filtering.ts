import FlexCommand from 'sap/ui/rta/command/FlexCommand';

import { NestedQuickActionDefinition, QuickActionContext } from '../../../cpe/quick-actions/quick-action-definition';
import Table from 'sap/ui/mdc/Table';
import { TableQuickActionDefinitionBase } from './table-quick-action-base';
import { getRelevantControlFromActivePage } from '../../../cpe/quick-actions/utils';
import { createManifestPropertyChange } from '../../../utils/fe-v4';
import { getUi5Version, isLowerThanMinimalUi5Version } from '../../../utils/version';

export const ENABLE_TABLE_FILTERING = 'enable-table-filtering';
const CONTROL_TYPE = 'sap.ui.mdc.Table';

/**
 * Quick Action for enabling table filtering using table personalization settings.
 */
export class EnableTableFilteringQuickAction
    extends TableQuickActionDefinitionBase
    implements NestedQuickActionDefinition {
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
            const value = this.context.changeService.getConfigurationPropertyValue(
                smartTable.getId(),
                'Filter'
            );
            const isFilterEnabled =
                value === undefined ? personalizationData.includes('Filter') : (value as boolean);
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

        const command = await createManifestPropertyChange(modifiedControl, flexSettings);
        if (command) {
            return [command];
        } else {
            return [];
        }
    }
}
