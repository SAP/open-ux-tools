import FlexCommand from 'sap/ui/rta/command/FlexCommand';
import type Table from 'sap/m/Table';
import type SmartTable from 'sap/ui/comp/smarttable/SmartTable';
import OverlayRegistry from 'sap/ui/dt/OverlayRegistry';
import ManagedObject from 'sap/ui/base/ManagedObject';
import UI5Element from 'sap/ui/core/Element';

import { QuickActionContext, NestedQuickActionDefinition } from '../../../cpe/quick-actions/quick-action-definition';
import { getControlById, isA } from '../../../utils/core';
import { DialogFactory, DialogNames } from '../../dialog-factory';
import { TableQuickActionDefinitionBase } from '../table-quick-action-base';
import { DIALOG_ENABLEMENT_VALIDATOR } from '../dialog-enablement-validator';
import type OverflowToolbar from 'sap/m/OverflowToolbar';
import { NestedQuickActionChild } from '@sap-ux-private/control-property-editor-common';

export const CREATE_TABLE_ACTION = 'create-table-action';
const SMART_TABLE_TYPE = 'sap.ui.comp.smarttable.SmartTable';
const M_TABLE_TYPE = 'sap.m.Table';
// maintain order if action id

const CONTROL_TYPES = [SMART_TABLE_TYPE, M_TABLE_TYPE, 'sap.ui.table.TreeTable', 'sap.ui.table.Table'];

export class AddTableActionQuickAction extends TableQuickActionDefinitionBase implements NestedQuickActionDefinition {
    constructor(context: QuickActionContext) {
        super(CREATE_TABLE_ACTION, CONTROL_TYPES, 'QUICK_ACTION_ADD_CUSTOM_TABLE_ACTION', context, undefined, [
            DIALOG_ENABLEMENT_VALIDATOR
        ]);
    }

    async initialize(): Promise<void> {
        const processChild = (child: NestedQuickActionChild, mapKey: string) => {
            const table = this.tableMap[mapKey]?.table;
            if (table) {
                const headerToolbar = this.getHeaderToolbar(table);
                if (!headerToolbar) {
                    child.enabled = false;
                    child.tooltip = this.context.resourceBundle.getText('NO_TABLE_HEADER_TOOLBAR');
                }
            }

            child.children.forEach((nestedChild, idx) => processChild(nestedChild, `${mapKey}/${idx.toFixed(0)}`));
        };

        await super.initialize();

        // disable nested actions based on conditions
        this.children.forEach((nestedChild, idx) => processChild(nestedChild, `${idx.toFixed(0)}`));
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

        const headerToolbar = this.getHeaderToolbar(table);

        // open dialogBox to add, and content is selected ByDefault
        if (headerToolbar) {
            const overlay = OverlayRegistry.getOverlay(headerToolbar as UI5Element) || [];
            await DialogFactory.createDialog(overlay, this.context.rta, DialogNames.ADD_FRAGMENT, undefined, {
                aggregation: 'content',
                title: 'QUICK_ACTION_ADD_CUSTOM_TABLE_ACTION',
                defaultAggregationArrayIndex: 1
            });
        }
        return [];
    }

    getHeaderToolbar(table: UI5Element): ManagedObject | ManagedObject[] | OverflowToolbar | null | undefined {
        let headerToolbar;
        if (isA<SmartTable>(SMART_TABLE_TYPE, table)) {
            for (const item of table.getAggregation('items') as ManagedObject[]) {
                if (item.getAggregation('headerToolbar')) {
                    headerToolbar = item.getAggregation('headerToolbar');
                    break;
                }
                if (isA<OverflowToolbar>('sap.m.OverflowToolbar', item)) {
                    headerToolbar = item;
                    break;
                }
            }
            if (!headerToolbar) {
                headerToolbar = table.getToolbar();
            }
        } else if (isA<Table>(M_TABLE_TYPE, table)) {
            headerToolbar = table.getAggregation('headerToolbar');
        }
        return headerToolbar;
    }
}
