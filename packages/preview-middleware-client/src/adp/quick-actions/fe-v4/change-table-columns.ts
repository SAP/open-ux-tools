import OverlayUtil from 'sap/ui/dt/OverlayUtil';
import FlexCommand from 'sap/ui/rta/command/FlexCommand';
import Table from 'sap/ui/mdc/Table';
import FlexRuntimeInfoAPI from 'sap/ui/fl/apply/api/FlexRuntimeInfoAPI';

import type { NestedQuickActionChild, NestedQuickAction } from '@sap-ux-private/control-property-editor-common';
import { NESTED_QUICK_ACTION_KIND } from '@sap-ux-private/control-property-editor-common';

import { QuickActionContext, NestedQuickActionDefinition } from '../../../cpe/quick-actions/quick-action-definition';
import { getRelevantControlFromActivePage } from '../../../cpe/quick-actions/utils';
import { getControlById } from '../../../utils/core';

export const CHANGE_TABLE_COLUMNS = 'change-table-columns';
const ACTION_ID = 'CTX_SETTINGS0';
const CONTROL_TYPE = 'sap.ui.mdc.Table';


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
    tableMap: Record<string, number> = {};
    constructor(private context: QuickActionContext) {}

    async initialize(): Promise<void> {
        let index = 0;
        for (const smartTable of getRelevantControlFromActivePage(this.context.controlIndex, this.context.view, [
            CONTROL_TYPE
        ])) {
            const hasVariantManagement = FlexRuntimeInfoAPI.hasVariantManagement({ element: smartTable });
            if (!hasVariantManagement) {
                continue;
            }
            const actions = await this.context.actionService.get(smartTable.getId());
            const changeColumnAction = actions.find((action) => action.id === ACTION_ID);
            if (changeColumnAction) {
                this.children.push({
                    label: `'${(smartTable as Table).getHeader()}' table`,
                    children: []
                });
                this.tableMap[`${this.children.length - 1}`] = index;
                index++;
            }
        }
        if (this.children.length > 0) {
            this.isActive = true;
        }
    }

    getActionObject(): NestedQuickAction {
        return {
            kind: NESTED_QUICK_ACTION_KIND,
            id: this.id,
            enabled: this.isActive,
            title: this.context.resourceBundle.getText('V4_QUICK_ACTION_CHANGE_TABLE_COLUMNS'),
            children: this.children
        };
    }

    async execute(path: string): Promise<FlexCommand[]> {
        const index = this.tableMap[path];
        const smartTables = getRelevantControlFromActivePage(this.context.controlIndex, this.context.view, [
            CONTROL_TYPE
        ]);
        for (let i = 0; i < smartTables.length; i++) {
            if (i === index) {
                const section = getControlById(smartTables[i].getId());
                const controlOverlay = OverlayUtil.getClosestOverlayFor(section);
                if (controlOverlay) {
                    controlOverlay.setSelected(true);
                }
                const hasVariantManagement = FlexRuntimeInfoAPI.hasVariantManagement({ element: smartTables[i] });
                if (!hasVariantManagement) {
                    continue;
                }
                await this.context.actionService.execute(smartTables[i].getId(), ACTION_ID);
            }
        }

        return [];
    }
}
