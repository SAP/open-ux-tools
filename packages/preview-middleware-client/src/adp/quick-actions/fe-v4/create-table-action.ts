import OverlayUtil from 'sap/ui/dt/OverlayUtil';
import type FlexCommand from 'sap/ui/rta/command/FlexCommand';

import { QuickActionContext, NestedQuickActionDefinition } from '../../../cpe/quick-actions/quick-action-definition';
import { getControlById } from '../../../utils/core';
import { DialogFactory, DialogNames } from '../../dialog-factory';
import { DIALOG_ENABLEMENT_VALIDATOR } from '../dialog-enablement-validator';
import { TableQuickActionDefinitionBase } from '../table-quick-action-base';
import { MDC_TABLE_TYPE } from '../control-types';
import { preprocessActionExecution } from '../fe-v2/create-table-custom-column';

export const CREATE_TABLE_ACTION = 'create_table_action';

/**
 * Quick Action for creating table action.
 */
export class AddTableActionQuickAction extends TableQuickActionDefinitionBase implements NestedQuickActionDefinition {
    constructor(context: QuickActionContext) {
        super(CREATE_TABLE_ACTION, [MDC_TABLE_TYPE], 'QUICK_ACTION_ADD_CUSTOM_TABLE_ACTION', context, undefined, [
            DIALOG_ENABLEMENT_VALIDATOR
        ]);
    }

    async execute(path: string): Promise<FlexCommand[]> {
        const { table, sectionInfo, iconTabBarFilterKey } = this.tableMap[path];
        if (!table) {
            return [];
        }

        preprocessActionExecution(table, sectionInfo, this.iconTabBar, iconTabBarFilterKey);
        const tableControl = getControlById(table.getId());
        const controlOverlay = OverlayUtil.getClosestOverlayFor(tableControl);
        if (controlOverlay) {
            controlOverlay.setSelected(true);

            await DialogFactory.createDialog(controlOverlay, this.context.rta, DialogNames.ADD_FRAGMENT, undefined, {
                aggregation: 'actions',
                defaultAggregationArrayIndex: 0,
                title: 'QUICK_ACTION_ADD_CUSTOM_TABLE_ACTION'
            });
        }

        return [];
    }
}
