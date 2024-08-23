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
import { getControlById, isA, isManagedObject } from '../../../utils/core';
import { getUi5Version, isLowerThanMinimalUi5Version } from '../../../utils/version';

export const CHANGE_TABLE_COLUMNS = 'change-table-columns';
const SMART_TABLE_ACTION_ID = 'CTX_COMP_VARIANT_CONTENT';
const M_TABLE_ACTION_ID = 'CTX_ADD_ELEMENTS_AS_CHILD';
const SETTINGS_ID = 'CTX_SETTINGS';
const ICON_TAB_BAR_TYPE = 'sap.m.IconTabBar';
const SMART_TABLE_TYPE = 'sap.ui.comp.smarttable.SmartTable';
const M_TABLE_TYPE = 'sap.m.Table';
// maintain order if action id
const ACTION_ID = [SMART_TABLE_ACTION_ID, M_TABLE_ACTION_ID, SETTINGS_ID];
const CONTROL_TYPES = [SMART_TABLE_TYPE, M_TABLE_TYPE, 'sap.ui.table.TreeTable', 'sap.ui.table.Table'];

/**
 * Quick Action for changing table columns.
 */
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
            changeColumnActionId: string;
        }
    > = {};
    private eventAttachedOnce: boolean = false;
    private iconTabBar: IconTabBar | undefined;
    constructor(private context: QuickActionContext) {}

    async initialize(): Promise<void>  {
        // No action found in control design time for version < 1.96
        // When using openPersonalizationDialog("Column") the variant is stored on browser local storage.
        const version = await getUi5Version();
        if (isLowerThanMinimalUi5Version(version, { major: 1, minor: 96 })) {
            this.isActive = false;
            return;
        }
        // Assumption Only one tab bar control per page.
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
            const changeColumnAction = ACTION_ID.find(
                (actionId) => actions.findIndex((action) => action.id === actionId) > -1
            );
            const tabKey = Object.keys(filters).find((key) => table.getId().endsWith(key));
            if (changeColumnAction) {
                if (this.iconTabBar && tabKey) {
                    this.children.push({
                        label: `'${filters[tabKey]}' table`,
                        children: []
                    });
                    this.tableMap[`${this.children.length - 1}`] = {
                        table: table,
                        iconTabBarFilterKey: tabKey,
                        changeColumnActionId: changeColumnAction
                    };
                } else {
                    this.processTable(table, changeColumnAction);
                }
            }
        }

        if (this.children.length > 0) {
            this.isActive = true;
        }
    }

    private getTableLabel(tableName: string | undefined): string {
        return tableName ? `'${tableName}' table` : 'Unnamed table';
    }

    private processTable(table: UI5Element, changeColumnActionId: string): void {
        if (isA<SmartTable>(SMART_TABLE_TYPE, table)) {
            this.children.push({
                label: this.getTableLabel(table.getHeader()),
                children: []
            });
        }
        if (isA<Table>(M_TABLE_TYPE, table)) {
            this.children.push({
                label: this.getTableLabel(table?.getHeaderToolbar()?.getTitleControl()?.getText()),
                children: []
            });
        }
        this.tableMap[`${this.children.length - 1}`] = {
            table,
            changeColumnActionId
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
        const { table, iconTabBarFilterKey, changeColumnActionId } = this.tableMap[path];
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

        const executeAction = async () => await this.context.actionService.execute(table.getId(), changeColumnActionId);
        if (isA<SmartTable>(SMART_TABLE_TYPE, table) || isA<Table>(M_TABLE_TYPE, table)) {
            // if table is busy, i.e. lazy loading, then we subscribe to 'updateFinished' event and call action service when loading is done
            if (table.getBusy()) {
                // to avoid reopening the dialog after close
                if (!this.eventAttachedOnce) {
                    table.attachEventOnce('updateFinished', executeAction);
                    this.eventAttachedOnce = true;
                }
            } else {
                await executeAction();
            }
        }

        return [];
    }
}
