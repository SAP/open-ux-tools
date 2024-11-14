import FlexCommand from 'sap/ui/rta/command/FlexCommand';

import { QuickActionContext, NestedQuickActionDefinition } from '../../../cpe/quick-actions/quick-action-definition';
import OverlayRegistry from 'sap/ui/dt/OverlayRegistry';
import { DialogNames, handler } from '../../init-dialogs';
import {
    SMART_TABLE_TYPE,
    GRID_TABLE_TYPE,
    MDC_TABLE_TYPE,
    TableQuickActionDefinitionBase,
    TREE_TABLE_TYPE
} from '../table-quick-action-base';
import { preprocessActionExecution } from '../fe-v2/create-table-custom-column';

export const CREATE_TABLE_CUSTOM_COLUMN = 'create-table-custom-column';

export const CONTROL_TYPES = [SMART_TABLE_TYPE, MDC_TABLE_TYPE, TREE_TABLE_TYPE, GRID_TABLE_TYPE];

export class AddTableCustomColumnQuickAction
    extends TableQuickActionDefinitionBase
    implements NestedQuickActionDefinition
{
    constructor(context: QuickActionContext) {
        super(CREATE_TABLE_CUSTOM_COLUMN, CONTROL_TYPES, 'QUICK_ACTION_ADD_CUSTOM_TABLE_COLUMN', context);
    }

    async execute(path: string): Promise<FlexCommand[]> {
        const { table, iconTabBarFilterKey, sectionInfo } = this.tableMap[path];
        if (!table) {
            return [];
        }

        preprocessActionExecution(table, sectionInfo, this.iconTabBar, iconTabBarFilterKey);
        this.selectOverlay(table);

        const overlay = OverlayRegistry.getOverlay(table);
        await handler(overlay, this.context.rta, DialogNames.ADD_FRAGMENT, undefined, {
            aggregation: 'columns',
            title: 'QUICK_ACTION_ADD_CUSTOM_TABLE_COLUMN'
        });
        return [];
    }
}
