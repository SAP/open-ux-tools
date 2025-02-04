import FlexCommand from 'sap/ui/rta/command/FlexCommand';

import { NestedQuickActionDefinition, QuickActionContext } from '../../../cpe/quick-actions/quick-action-definition';
import Table from 'sap/ui/mdc/Table';
import { TableQuickActionDefinitionBase } from '../table-quick-action-base';
import { getRelevantControlFromActivePage } from '../../../cpe/quick-actions/utils';
import { createManifestPropertyChange } from '../../../utils/fe-v4';
import { getUi5Version, isLowerThanMinimalUi5Version } from '../../../utils/version';
import { MDC_TABLE_TYPE } from '../control-types';

export const ENABLE_TABLE_FILTERING = 'enable-table-filtering';

type Personalization = {
    sort: boolean;
    column: boolean;
    filter: boolean;
    group: boolean;
    aggregate: boolean;
};

/**
 * Quick Action for enabling table filtering using table personalization settings.
 */
export class EnableTableFilteringQuickAction
    extends TableQuickActionDefinitionBase
    implements NestedQuickActionDefinition
{
    constructor(context: QuickActionContext) {
        super(ENABLE_TABLE_FILTERING, [MDC_TABLE_TYPE], 'QUICK_ACTION_ENABLE_TABLE_FILTERING', context);
    }
    readonly forceRefreshAfterExecution = true;

    async initialize(): Promise<void> {
        const version = await getUi5Version();
        if (isLowerThanMinimalUi5Version(version, { major: 1, minor: 131 })) {
            this.isApplicable = false;
            return;
        }

        const tooltipText = this.context.resourceBundle.getText('TABLE_FILTERING_CHANGE_HAS_ALREADY_BEEN_MADE');

        for (const smartTable of getRelevantControlFromActivePage(this.context.controlIndex, this.context.view, [
            MDC_TABLE_TYPE
        ])) {
            const personalizationData = (smartTable as Table).getP13nMode();
            const value = this.context.changeService.getConfigurationPropertyValue(
                smartTable.getId(),
                'personalization'
            ) as Personalization;
            const isFilterEnabled = value?.filter === undefined ? personalizationData.includes('Filter') : value.filter;
            this.children.push({
                label: `'${(smartTable as Table).getHeader()}' table`,
                enabled: !isFilterEnabled,
                tooltip: isFilterEnabled ? tooltipText : undefined,
                children: []
            });
            this.tableMap[`${this.children.length - 1}`] = {
                table: smartTable,
                tableUpdateEventAttachedOnce: false
            };
        }

        if (this.children.length > 0) {
            this.isApplicable = true;
        }
    }

    async execute(path: string): Promise<FlexCommand[]> {
        const { flexSettings } = this.context;
        const { table } = this.tableMap[path];

        if (!table) {
            return [];
        }
        const propertyChange = {
            personalization: {
                sort: true,
                column: true,
                filter: true,
                group: true,
                aggregate: true
            }
        };
        const command = await createManifestPropertyChange(table, flexSettings, propertyChange);
        if (command) {
            return [command];
        } else {
            return [];
        }
    }
}
