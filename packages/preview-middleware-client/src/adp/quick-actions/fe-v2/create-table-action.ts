import FlexCommand from 'sap/ui/rta/command/FlexCommand';
import type Table from 'sap/m/Table';
import type SmartTable from 'sap/ui/comp/smarttable/SmartTable';

import { QuickActionContext, NestedQuickActionDefinition } from '../../../cpe/quick-actions/quick-action-definition';
import { getControlById, isA } from '../../../utils/core';
import OverlayRegistry from 'sap/ui/dt/OverlayRegistry';
import { DialogNames, handler } from '../../init-dialogs';
import { TableQuickActionDefinitionBase } from './table-quick-action-base';
import ManagedObject from 'sap/ui/base/ManagedObject';
import UI5Element from 'sap/ui/core/Element';

export const CREATE_TABLE_ACTION = 'create-table-action';
const SMART_TABLE_TYPE = 'sap.ui.comp.smarttable.SmartTable';
const M_TABLE_TYPE = 'sap.m.Table';
// maintain order if action id

const CONTROL_TYPES = [SMART_TABLE_TYPE, M_TABLE_TYPE, 'sap.ui.table.TreeTable', 'sap.ui.table.Table'];

export class AddTableActionQuickAction extends TableQuickActionDefinitionBase implements NestedQuickActionDefinition {
    constructor(context: QuickActionContext) {
        super(CREATE_TABLE_ACTION, CONTROL_TYPES, 'QUICK_ACTION_ADD_CUSTOM_TABLE_ACTION', context);
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

        let headerToolbar;
        if (isA<SmartTable>(SMART_TABLE_TYPE, table)) {
            headerToolbar = (table.getAggregation('items') as ManagedObject[])[0].getAggregation('headerToolbar');
        } else if (isA<Table>(M_TABLE_TYPE, table)) {
            headerToolbar = table.getAggregation('headerToolbar');
        }

        // open dialogBox to add, and content is selected ByDefault
        if (headerToolbar) {
            const overlay = OverlayRegistry.getOverlay(headerToolbar as UI5Element) || [];
            await handler(overlay, this.context.rta, DialogNames.ADD_FRAGMENT, undefined, {
                aggregation: 'content',
                title: 'QUICK_ACTION_ADD_CUSTOM_TABLE_ACTION'
            });
        }
        return [];
    }
}
