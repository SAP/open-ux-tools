import OverlayUtil from 'sap/ui/dt/OverlayUtil';
import type FlexCommand from 'sap/ui/rta/command/FlexCommand';

import { QuickActionContext, NestedQuickActionDefinition } from '../../../cpe/quick-actions/quick-action-definition';
import { getRelevantControlFromActivePage } from '../../../cpe/quick-actions/utils';
import { getControlById } from '../../../utils/core';
import { DialogFactory, DialogNames } from '../../dialog-factory';
import { DIALOG_ENABLEMENT_VALIDATOR } from '../dialog-enablement-validator';
import { TableQuickActionDefinitionBase } from './table-quick-action-base';
import { MDC_TABLE_TYPE } from '../control-types';

export const CREATE_TABLE_ACTION = 'create_table_action';
const TOOLBAR_ACTION = 'sap.ui.mdc.ActionToolbar';

/**
 * Quick Action for creating table action.
 */
export class AddTableActionQuickAction extends TableQuickActionDefinitionBase implements NestedQuickActionDefinition {
    constructor(context: QuickActionContext) {
        super(CREATE_TABLE_ACTION, [MDC_TABLE_TYPE], 'QUICK_ACTION_ADD_CUSTOM_TABLE_ACTION', context, true, [
            DIALOG_ENABLEMENT_VALIDATOR
        ]);
    }

    async execute(path: string): Promise<FlexCommand[]> {
        const index = this.tableMap[path];
        const smartTablesToolbarAction = getRelevantControlFromActivePage(
            this.context.controlIndex,
            this.context.view,
            [TOOLBAR_ACTION]
        );
        for (let i = 0; i < smartTablesToolbarAction.length; i++) {
            if (i === index) {
                const section = getControlById(smartTablesToolbarAction[i].getId());
                const controlOverlay = OverlayUtil.getClosestOverlayFor(section);
                if (controlOverlay) {
                    controlOverlay.setSelected(true);
                    await DialogFactory.createDialog(
                        controlOverlay,
                        this.context.rta,
                        DialogNames.ADD_FRAGMENT,
                        undefined,
                        {
                            aggregation: 'actions',
                            title: 'QUICK_ACTION_ADD_CUSTOM_TABLE_ACTION'
                        }
                    );
                }
            }
        }

        return [];
    }
}
