import FlexCommand from 'sap/ui/rta/command/FlexCommand';
import type SmartTable from 'sap/ui/comp/smarttable/SmartTable';

import { QuickActionContext, NestedQuickActionDefinition } from '../../../cpe/quick-actions/quick-action-definition';
import { getControlById, isA } from '../../../utils/core';
import OverlayRegistry from 'sap/ui/dt/OverlayRegistry';
import { DialogNames, handler } from '../../init-dialogs';
import {
    ANALYTICAL_TABLE_TYPE,
    GRID_TABLE_TYPE,
    M_TABLE_TYPE,
    SMART_TABLE_TYPE,
    TableQuickActionDefinitionBase,
    TREE_TABLE_TYPE
} from './table-quick-action-base';
import ManagedObject from 'sap/ui/base/ManagedObject';
import UI5Element from 'sap/ui/core/Element';

export const CREATE_TABLE_CUSTOM_COLUMN = 'create-table-custom-column';

const CONTROL_TYPES = [SMART_TABLE_TYPE, M_TABLE_TYPE, TREE_TABLE_TYPE, GRID_TABLE_TYPE];

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

        if (sectionInfo) {
            const { layout, section, subSection } = sectionInfo;
            layout?.setSelectedSection(section);
            section.setSelectedSubSection(subSection);
            this.selectOverlay(table);
        } else {
            getControlById(table.getId())?.getDomRef()?.scrollIntoView();
            this.selectOverlay(table);
        }

        if (this.iconTabBar && iconTabBarFilterKey) {
            this.iconTabBar.setSelectedKey(iconTabBarFilterKey);
        }

        let tableInternal: ManagedObject | undefined = table;
        if (isA<SmartTable>(SMART_TABLE_TYPE, table)) {
            const itemsAggregation = table.getAggregation('items') as ManagedObject[];
            tableInternal = itemsAggregation.find((item) => {
                return [M_TABLE_TYPE, TREE_TABLE_TYPE, ANALYTICAL_TABLE_TYPE, GRID_TABLE_TYPE].some((tType) =>
                    isA(tType, item)
                );
            });
            if (!tableInternal) {
                return [];
            }
        }

        const overlay = OverlayRegistry.getOverlay(tableInternal as UI5Element) || [];
        if (!overlay) {
            return [];
        }
        const dialog = [TREE_TABLE_TYPE, ANALYTICAL_TABLE_TYPE, GRID_TABLE_TYPE].some((type) =>
            isA(type, tableInternal)
        )
            ? DialogNames.ADD_FRAGMENT
            : DialogNames.ADD_TABLE_COLUMN_FRAGMENTS;
        await handler(overlay, this.context.rta, dialog, undefined, {
            aggregation: 'columns',
            title: 'QUICK_ACTION_ADD_CUSTOM_TABLE_COLUMN'
        });

        return [];
    }
}
