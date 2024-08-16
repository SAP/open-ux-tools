import OverlayUtil from 'sap/ui/dt/OverlayUtil';
import FlexCommand from 'sap/ui/rta/command/FlexCommand';

import { NESTED_QUICK_ACTION_KIND, NestedQuickAction } from '@sap-ux-private/control-property-editor-common';
import { NestedQuickActionChild } from '@sap-ux-private/control-property-editor-common';

import { QuickActionContext, NestedQuickActionDefinition } from '../../../cpe/quick-actions/quick-action-definition';
import { getRelevantControlFromActivePage } from '../../../cpe/quick-actions/utils';
import type SmartTable from 'sap/ui/comp/smarttable/SmartTable';
import Table from 'sap/m/Table';
import { getControlById, isA } from '../../../cpe/utils';
import UI5Element from 'sap/ui/core/Element';
import IconTabBar from 'sap/m/IconTabBar';
import IconTabFilter from 'sap/m/IconTabFilter';

export const CHANGE_TABLE_COLUMNS = 'change-table-columns';
const SMART_TABLE_ACTION_ID = 'CTX_COMP_VARIANT_CONTENT';
const M_TABLE_ACTION_ID = 'CTX_ADD_ELEMENTS_AS_CHILD';
const ACTION_ID = [SMART_TABLE_ACTION_ID, M_TABLE_ACTION_ID];
const CONTROL_TYPES = ['sap.ui.comp.smarttable.SmartTable', 'sap.m.Table'];

export class ChangeTableColumnsQuickAction implements NestedQuickActionDefinition {
    readonly kind = NESTED_QUICK_ACTION_KIND;
    readonly type = CHANGE_TABLE_COLUMNS;
    public get id(): string {
        return `${this.context.key}-${this.type}`;
    }
    isActive = false;
    isClearButtonEnabled = false;
    children: NestedQuickActionChild[] = [];
    tableMap: Record<
        string,
        {
            table: UI5Element;
            iconTabBarFilterKey?: string;
        }
    > = {};
    private eventAttachedOnce: boolean = false;
    private iconTabBar: IconTabBar | undefined;
    constructor(private context: QuickActionContext) {}

    async initialize() {
        const tabBar = getRelevantControlFromActivePage(this.context.controlIndex, this.context.view, [
            'sap.m.IconTabBar'
        ])[0];
        const filters: { [key: string]: string } = {};
        if (tabBar) {
            this.iconTabBar = getControlById<IconTabBar>(tabBar.getId());
            this.iconTabBar?.getItems().forEach((item) => {
                filters[(item as IconTabFilter).getKey()] = (item as IconTabFilter).getText();
            });
        }

        for (const table of getRelevantControlFromActivePage(
            this.context.controlIndex,
            this.context.view,
            CONTROL_TYPES
        )) {
            const actions = await this.context.actionService.get(table.getId());
            const changeColumnAction = actions.some((action) => ACTION_ID.includes(action.id));
            if (changeColumnAction) {
                const tabKey = Object.keys(filters).find((key) => table.getId().endsWith(key));
                if (this.iconTabBar && tabKey) {
                    this.children.push({
                        label: `'${filters[tabKey]}' table`,
                        children: []
                    });
                    this.tableMap[`${this.children.length - 1}`] = {
                        table,
                        iconTabBarFilterKey: tabKey
                    };
                } else {
                    if (isA<SmartTable>('sap.ui.comp.smarttable.SmartTable', table)) {
                        this.children.push({
                            label: `'${table.getHeader()}' table`,
                            children: []
                        });
                    }
                    if (isA<Table>('sap.m.Table', table)) {
                        const title = table?.getHeaderToolbar()?.getTitleControl()?.getText() || 'Unknown';
                        this.children.push({
                            label: `'${title}' table`,
                            children: []
                        });
                    }
                    this.tableMap[`${this.children.length - 1}`] = {
                        table
                    };
                }
            }
        }

        if (this.children.length > 0) {
            this.isActive = true;
        }
    }

    getActionObject(): NestedQuickAction {
        const key = 'V2_QUICK_ACTION_CHANGE_TABLE_COLUMNS';
        return {
            kind: NESTED_QUICK_ACTION_KIND,
            id: this.id,
            enabled: this.isActive,
            title: this.context.resourceBundle.getText(key) ?? key,
            children: this.children
        };
    }

    async execute(path: string): Promise<FlexCommand[]> {
        const { table, iconTabBarFilterKey } = this.tableMap[path];
        if (table) {
            getControlById(table.getId())?.getDomRef()?.scrollIntoView();
            const controlOverlay = OverlayUtil.getClosestOverlayFor(table);
            if (controlOverlay) {
                controlOverlay.setSelected(true);
            }

            if (this.iconTabBar && iconTabBarFilterKey) {
                this.iconTabBar.setSelectedKey(iconTabBarFilterKey);
            }
            if (isA<SmartTable>('sap.ui.comp.smarttable.SmartTable', table)) {
                await this.context.actionService.execute(table.getId(), SMART_TABLE_ACTION_ID);
            }
            if (isA<Table>('sap.m.Table', table)) {
                if (table.getItems().length > 0) {
                    await this.context.actionService.execute(table.getId(), M_TABLE_ACTION_ID);
                }
                // to avoid reopening the dialog after close
                if (!this.eventAttachedOnce) {
                    table.attachEventOnce(
                        'updateFinished',
                        async () => await this.context.actionService.execute(table.getId(), M_TABLE_ACTION_ID)
                    );
                    this.eventAttachedOnce = true;
                }
            }
        }
        return [];
    }
}
