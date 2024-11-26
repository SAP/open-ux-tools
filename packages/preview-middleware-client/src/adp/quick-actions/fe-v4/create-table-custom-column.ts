import FlexCommand from 'sap/ui/rta/command/FlexCommand';

import { QuickActionContext, NestedQuickActionDefinition } from '../../../cpe/quick-actions/quick-action-definition';
import OverlayRegistry from 'sap/ui/dt/OverlayRegistry';
import { DialogNames, handler } from '../../init-dialogs';
import {
    SMART_TABLE_TYPE,
    GRID_TABLE_TYPE,
    MDC_TABLE_TYPE,
    TableQuickActionDefinitionBase,
    TREE_TABLE_TYPE,
    M_TABLE_TYPE
} from '../table-quick-action-base';
import { preprocessActionExecution } from '../fe-v2/create-table-custom-column';
import ManagedObject from 'sap/ui/base/ManagedObject';
import { isA } from '../../../utils/core';

export const CREATE_TABLE_CUSTOM_COLUMN = 'create-table-custom-column';

export const CONTROL_TYPES = [SMART_TABLE_TYPE, MDC_TABLE_TYPE, TREE_TABLE_TYPE, GRID_TABLE_TYPE];

export class AddTableCustomColumnQuickAction
    extends TableQuickActionDefinitionBase
    implements NestedQuickActionDefinition {
    constructor(context: QuickActionContext) {
        super(CREATE_TABLE_CUSTOM_COLUMN, CONTROL_TYPES, 'QUICK_ACTION_ADD_CUSTOM_TABLE_COLUMN', context);
    }


    async initialize(): Promise<void> {
        await super.initialize((table, child) => {
            const innerTable = this.getInternalTable(table);
            const tableRows = innerTable?.getAggregation('items') as ManagedObject[] | [];
            if (isA(M_TABLE_TYPE, innerTable) && !tableRows || tableRows.length === 0) {
                child.enabled = false;
                child.tooltip = this.context.resourceBundle.getText('TABLE_CUSTOM_COLUMN_ACTION_NOT_AVAILABLE');
            }

        });
    }


    async execute(path: string): Promise<FlexCommand[]> {
        const { table, iconTabBarFilterKey, sectionInfo } = this.tableMap[path];
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
