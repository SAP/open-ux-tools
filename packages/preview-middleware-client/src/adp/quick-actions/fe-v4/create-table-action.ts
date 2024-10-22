import OverlayUtil from 'sap/ui/dt/OverlayUtil';
import FlexCommand from 'sap/ui/rta/command/FlexCommand';
import Table from 'sap/ui/mdc/Table';

import type { NestedQuickActionChild, NestedQuickAction } from '@sap-ux-private/control-property-editor-common';
import { NESTED_QUICK_ACTION_KIND } from '@sap-ux-private/control-property-editor-common';

import { QuickActionContext, NestedQuickActionDefinition } from '../../../cpe/quick-actions/quick-action-definition';
import { getRelevantControlFromActivePage } from '../../../cpe/quick-actions/utils';
import { getControlById } from '../../../utils/core';
import { DialogNames, handler } from '../../init-dialogs';

export const CREATE_TABLE_ACTION = 'create_table_action';
const ACTION_ID = 'CTX_SETTINGS0';
const CONTROL_TYPE = 'sap.ui.mdc.Table';
const TOOLBAR_ACTION = 'sap.ui.mdc.ActionToolbar';

/**
 * Quick Action for creating table action.
 */
export class AddTableActionQuickAction implements NestedQuickActionDefinition {
    readonly kind = NESTED_QUICK_ACTION_KIND;
    readonly type = CREATE_TABLE_ACTION;
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
            title: this.context.resourceBundle.getText('QUICK_ACTION_ADD_CUSTOM_TABLE_ACTION'),
            children: this.children
        };
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
                    await handler(controlOverlay, this.context.rta, DialogNames.ADD_FRAGMENT, undefined, {
                        aggregation: 'actions',
                        title: 'QUICK_ACTION_ADD_CUSTOM_TABLE_ACTION'
                    });
                }
            }
        }

        return [];
    }
}
