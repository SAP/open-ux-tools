import OverlayUtil from 'sap/ui/dt/OverlayUtil';
import FlexCommand from 'sap/ui/rta/command/FlexCommand';
import FlexRuntimeInfoAPI from 'sap/ui/fl/apply/api/FlexRuntimeInfoAPI';
import { QuickActionContext, NestedQuickActionDefinition } from '../../../cpe/quick-actions/quick-action-definition';
import { getControlById } from '../../../utils/core';
import { TableQuickActionDefinitionBase } from '../table-quick-action-base';
import { MDC_TABLE_TYPE } from '../control-types';
import { DIALOG_ENABLEMENT_VALIDATOR } from '../dialog-enablement-validator';
import { getRelevantControlFromActivePage } from '../../../cpe/quick-actions/utils';
import Table from 'sap/ui/mdc/Table';

export const CHANGE_TABLE_COLUMNS = 'change-table-columns';
const ACTION_ID = 'CTX_SETTINGS0';

/**
 * Quick Action for changing table columns.
 */
export class ChangeTableColumnsQuickAction
    extends TableQuickActionDefinitionBase
    implements NestedQuickActionDefinition
{
    constructor(context: QuickActionContext) {
        super(CHANGE_TABLE_COLUMNS, [MDC_TABLE_TYPE], 'V4_QUICK_ACTION_CHANGE_TABLE_COLUMNS', context, undefined, [
            DIALOG_ENABLEMENT_VALIDATOR
        ]);
    }

    async initialize(): Promise<void> {
        for (const smartTable of getRelevantControlFromActivePage(
            this.context.controlIndex,
            this.context.view,
            this.controlTypes
        )) {
            const hasVariantManagement = FlexRuntimeInfoAPI.hasVariantManagement({ element: smartTable });
            if (!hasVariantManagement) {
                continue;
            }

            const actions = await this.context.actionService.get(smartTable.getId());
            const changeColumnAction = actions.find((action) => action.id === ACTION_ID);
            if (changeColumnAction) {
                this.children.push({
                    label: `'${(smartTable as Table).getHeader()}' table`,
                    enabled: true,
                    children: []
                });
                this.tableMap[`${this.children.length - 1}`] = {
                    table: smartTable,
                    tableUpdateEventAttachedOnce: false
                };
            }
        }

        if (this.children.length > 0) {
            this.isApplicable = true;
        }
    }

    async execute(path: string): Promise<FlexCommand[]> {
        const { table } = this.tableMap[path];
        if (!table) {
            return [];
        }
        const tableControl = getControlById(table.getId());
        const controlOverlay = OverlayUtil.getClosestOverlayFor(tableControl);
        if (controlOverlay) {
            controlOverlay.setSelected(true);
        }
        const hasVariantManagement = FlexRuntimeInfoAPI.hasVariantManagement({ element: table });
        if (hasVariantManagement) {
            await this.context.actionService.execute(table.getId(), ACTION_ID);
        }

        return [];
    }
}
