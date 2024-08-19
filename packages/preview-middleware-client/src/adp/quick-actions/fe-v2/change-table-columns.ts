import OverlayUtil from 'sap/ui/dt/OverlayUtil';
import FlexCommand from 'sap/ui/rta/command/FlexCommand';
import UI5Element from 'sap/ui/core/Element';
import type IconTabBar from 'sap/m/IconTabBar';
import type IconTabFilter from 'sap/m/IconTabFilter';
import type Table from 'sap/m/Table';
import type SmartTable from 'sap/ui/comp/smarttable/SmartTable';

import type { NestedQuickAction, NestedQuickActionChild } from '@sap-ux-private/control-property-editor-common';
import { NESTED_QUICK_ACTION_KIND } from '@sap-ux-private/control-property-editor-common';

import { QuickActionContext, NestedQuickActionDefinition } from '../../../cpe/quick-actions/quick-action-definition';
import { getRelevantControlFromActivePage } from '../../../cpe/quick-actions/utils';
import { getControlById, isA, isManagedObject } from '../../../cpe/utils';

export const CHANGE_TABLE_COLUMNS = 'change-table-columns';
const SMART_TABLE_ACTION_ID = 'CTX_COMP_VARIANT_CONTENT';
const M_TABLE_ACTION_ID = 'CTX_ADD_ELEMENTS_AS_CHILD';
const ICON_TAB_BAR_TYPE = 'sap.m.IconTabBar';
const SMART_TABLE_TYPE = 'sap.ui.comp.smarttable.SmartTable';
const M_TABLE_TYPE = 'sap.m.Table';
const ACTION_ID = [SMART_TABLE_ACTION_ID, M_TABLE_ACTION_ID];
const CONTROL_TYPES = [SMART_TABLE_TYPE, M_TABLE_TYPE];

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
            ICON_TAB_BAR_TYPE
        ])[0];
        const filters: { [key: string]: string } = {};
        if (tabBar) {
            const control = getControlById(tabBar.getId());
            if (isA<IconTabBar>(ICON_TAB_BAR_TYPE, control)) {
                this.iconTabBar = control;
                for (const item of control.getItems()) {
                    if (isManagedObject(item) && isA<IconTabFilter>('sap.m.IconTabFilter', item)) {
                        filters[item.getKey()] = item.getText();
                    }
                }
            }
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
                    this.processTable(table);
                }
            }
        }

        if (this.children.length > 0) {
            this.isActive = true;
        }
    }

    private processTable(table: UI5Element): void {
        if (isA<SmartTable>(SMART_TABLE_TYPE, table)) {
            this.children.push({
                label: `'${table.getHeader()}' table`,
                children: []
            });
        }
        if (isA<Table>(M_TABLE_TYPE, table)) {
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
        if (!table) {
            return [];
        }

        getControlById(table.getId())?.getDomRef()?.scrollIntoView();
        const controlOverlay = OverlayUtil.getClosestOverlayFor(table);
        if (controlOverlay) {
            controlOverlay.setSelected(true);
        }

        if (this.iconTabBar && iconTabBarFilterKey) {
            this.iconTabBar.setSelectedKey(iconTabBarFilterKey);
        }
        if (isA<SmartTable>(SMART_TABLE_TYPE, table)) {
            await this.context.actionService.execute(table.getId(), SMART_TABLE_ACTION_ID);
        }
        if (isA<Table>(M_TABLE_TYPE, table)) {
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

        return [];
    }
}
