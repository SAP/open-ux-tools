import FlexCommand from 'sap/ui/rta/command/FlexCommand';
import { NestedQuickActionDefinition, QuickActionContext } from '../../../cpe/quick-actions/quick-action-definition';
import { getRelevantControlFromActivePage, pageHasControlId } from '../../../cpe/quick-actions/utils';
import { getControlById } from '../../../utils/core';
import {
    GRID_TABLE_TYPE,
    M_TABLE_TYPE,
    SMART_TABLE_TYPE,
    TableQuickActionDefinitionBase,
    TREE_TABLE_TYPE
} from '../table-quick-action-base';
import { executeToggleAction } from './utils';

export const ENABLE_TABLE_FILTERING = 'enable-table-filtering';
// TODO: specify correct ones
const CONTROL_TYPES = [SMART_TABLE_TYPE, M_TABLE_TYPE, TREE_TABLE_TYPE, GRID_TABLE_TYPE];

/**
 * Quick Action for toggling the visibility of "clear filter bar" button in List Report page.
 */
export class EnableTableFilteringQuickAction
    extends TableQuickActionDefinitionBase
    implements NestedQuickActionDefinition
{
    constructor(context: QuickActionContext) {
        super(ENABLE_TABLE_FILTERING, CONTROL_TYPES, 'QUICK_ACTION_ADD_CUSTOM_PAGE_ACTION', context);
    }
    isActive: boolean;
    readonly forceRefreshAfterExecution = true;
    private isTableFilteringInPageVariantEnabled = false;
    lsTableMap: Record<string, number> = {};
    initialize(): Promise<void> {
        let index = 0;
        const tables = getRelevantControlFromActivePage(
            this.context.controlIndex,
            this.context.view,
            CONTROL_TYPES
        );
        for (const table of tables) {
            const isActionApplicable = pageHasControlId(this.context.view, table.getId());
            const modifiedControl = getControlById(table.getId());
            if (modifiedControl) {
                const isFilterEnabled = modifiedControl.data('p13nDialogSettings').filter.visible;
                this.children.push({
                    label: this.getTableLabel(modifiedControl),
                    enabled: !isFilterEnabled,
                    tooltip: isFilterEnabled ? 'Filter already enabled' : undefined,
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

    protected get textKey() {
        return this.isTableFilteringInPageVariantEnabled
            ? 'V2_QUICK_ACTION_LR_DISABLE_TABLE_FILTERING'
            : 'V2_QUICK_ACTION_LR_ENABLE_TABLE_FILTERING';
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
