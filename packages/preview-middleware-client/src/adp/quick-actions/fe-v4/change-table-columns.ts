import OverlayUtil from 'sap/ui/dt/OverlayUtil';
import FlexCommand from 'sap/ui/rta/command/FlexCommand';
import FlexRuntimeInfoAPI from 'sap/ui/fl/apply/api/FlexRuntimeInfoAPI';
import { QuickActionContext, NestedQuickActionDefinition } from '../../../cpe/quick-actions/quick-action-definition';
import { getRelevantControlFromActivePage } from '../../../cpe/quick-actions/utils';
import { getControlById } from '../../../utils/core';
import { TableQuickActionDefinitionBase } from './table-quick-action-base';
import { MDC_TABLE_TYPE } from '../control-types';
import { DIALOG_ENABLEMENT_VALIDATOR } from '../dialog-enablement-validator';

export const CHANGE_TABLE_COLUMNS = 'change-table-columns';
const ACTION_ID = 'CTX_SETTINGS0';
const CONTROL_TYPE = 'sap.ui.mdc.Table';

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

    async execute(path: string): Promise<FlexCommand[]> {
        const index = this.tableMap[path];
        const smartTables = getRelevantControlFromActivePage(this.context.controlIndex, this.context.view, [
            CONTROL_TYPE
        ]);
        for (let i = 0; i < smartTables.length; i++) {
            if (i === index) {
                const section = getControlById(smartTables[i].getId());
                const controlOverlay = OverlayUtil.getClosestOverlayFor(section);
                if (controlOverlay) {
                    controlOverlay.setSelected(true);
                }
                const hasVariantManagement = FlexRuntimeInfoAPI.hasVariantManagement({ element: smartTables[i] });
                if (!hasVariantManagement) {
                    continue;
                }
                await this.context.actionService.execute(smartTables[i].getId(), ACTION_ID);
            }
        }

        return [];
    }
}
