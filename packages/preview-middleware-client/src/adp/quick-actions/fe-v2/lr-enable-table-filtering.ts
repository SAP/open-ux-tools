import FlexCommand from 'sap/ui/rta/command/FlexCommand';
import { NestedQuickActionDefinition, QuickActionContext } from '../../../cpe/quick-actions/quick-action-definition';
import { getRelevantControlFromActivePage } from '../../../cpe/quick-actions/utils';
import {
    GRID_TABLE_TYPE,
    M_TABLE_TYPE,
    SMART_TABLE_TYPE,
    TableQuickActionDefinitionBase,
    TREE_TABLE_TYPE
} from '../table-quick-action-base';
import { executeToggleAction } from './utils';
import { translateText } from '../../quick-actions/utils';

export const ENABLE_TABLE_FILTERING = 'enable-table-filtering';
// TODO: specify correct ones
const CONTROL_TYPES = [SMART_TABLE_TYPE, M_TABLE_TYPE, TREE_TABLE_TYPE, GRID_TABLE_TYPE];

/**
 * Quick Action for toggling the visibility of "clear filter bar" button in List Report page.
 */
export class EnableTableFilteringQuickAction
    extends TableQuickActionDefinitionBase
    implements NestedQuickActionDefinition {
    constructor(context: QuickActionContext) {
        super(ENABLE_TABLE_FILTERING, CONTROL_TYPES, 'QUICK_ACTION_ENABLE_TABLE_FILTERING', context);
    }
    isActive: boolean;
    readonly forceRefreshAfterExecution = true;
    isTableFilteringInPageVariantEnabled = false;
    lsTableMap: Record<string, number> = {};
    async initialize(): Promise<void> {
        let index = 0;
        const tooltipText = await translateText(`THE_CHANGE_HAS_ALREADY_BEEN_MADE`);
        const iconTabBarFilterMap = this.buildIconTabBarFilterMap();
        for (const table of getRelevantControlFromActivePage(
            this.context.controlIndex,
            this.context.view,
            CONTROL_TYPES
        )) {
            if (table) {
                const tabKey = Object.keys(iconTabBarFilterMap).find((key) => table.getId().endsWith(key));
                const isFilterEnabled = table.data('p13nDialogSettings').filter.visible;
                this.children.push({
                    label: tabKey ? `'${iconTabBarFilterMap[tabKey]}' table` : this.getTableLabel(table),
                    enabled: !isFilterEnabled,
                    tooltip: isFilterEnabled ? tooltipText : undefined,
                    children: []
                });
                this.lsTableMap[`${this.children.length - 1}`] = index;
                index++;
            }
        }

        if (this.children.length > 0) {
            this.isApplicable = true;
        }
        if (this.children.every((child) => !child.enabled)) {
            this.isDisabled = true;
        }
        return Promise.resolve();
    }


    async execute(path: string): Promise<FlexCommand[]> {
        const index = this.lsTableMap[path];
        const table = getRelevantControlFromActivePage(this.context.controlIndex, this.context.view, CONTROL_TYPES);

        const modifiedControl = table[index];
        if (!modifiedControl) {
            return [];
        }
        const command = await executeToggleAction(
            this.context,
            this.isTableFilteringInPageVariantEnabled,
            'component/settings',
            modifiedControl,
            {
                enableTableFilterInPageVariant: !this.isTableFilteringInPageVariantEnabled
            }
        );
        if (command.length) {
            this.isTableFilteringInPageVariantEnabled = !this.isTableFilteringInPageVariantEnabled;
        }
        return command;
    }
}
