import OverlayUtil from 'sap/ui/dt/OverlayUtil';
import FlexCommand from 'sap/ui/rta/command/FlexCommand';

import { NESTED_QUICK_ACTION_KIND, NestedQuickAction } from '@sap-ux-private/control-property-editor-common';
import { NestedQuickActionChild } from '@sap-ux-private/control-property-editor-common';

import { QuickActionContext, NestedQuickActionDefinition } from '../../../cpe/quick-actions/quick-action-definition';
import { getRelevantControlFromActivePage } from '../../../cpe/quick-actions/utils';
import SmartTable from 'sap/ui/comp/smarttable/SmartTable';
import Table from 'sap/m/Table';
import { isA } from '../../../cpe/utils';

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
    tableMap: Record<string, number> = {};
    eventAttachedOnce: boolean = false;
    constructor(private context: QuickActionContext) {}

    async initialize() {
        let index = 0;
        for (const table of getRelevantControlFromActivePage(
            this.context.controlIndex,
            this.context.view,
            CONTROL_TYPES
        )) {
            const actions = await this.context.actionService.get(table.getId());
            const changeColumnAction = actions.some((action) => ACTION_ID.includes(action.id));
            if (changeColumnAction) {
                if (table.isA('sap.ui.comp.smarttable.SmartTable')) {
                    this.children.push({
                        label: `'${(table as SmartTable).getHeader()}' table`,
                        children: []
                    });
                }
                if (table.isA('sap.m.Table')) {
                    const title = (table as Table)?.getHeaderToolbar()?.getTitleControl()?.getText() || 'Unknown';
                    this.children.push({
                        label: `'${title}' table`,
                        children: []
                    });
                }

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
            // TODO: translate this?
            title: 'Change table columns',
            children: this.children
        };
    }

    async execute(path: string): Promise<FlexCommand[]> {
        const index = this.tableMap[path];
        const smartTables = getRelevantControlFromActivePage(
            this.context.controlIndex,
            this.context.view,
            CONTROL_TYPES
        );
        const results = await Promise.all(
            smartTables.map(async (element) => {
                const tableActions = await this.context.actionService.get(element.getId());
                return tableActions.some((action) => ACTION_ID.includes(action.id));
            })
        );
        // Table with no actions has to be filtered out to match the right path from the UI.
        const tablesWithAction = smartTables.filter((_, index) => results[index]);
        for (let i = 0; i < tablesWithAction.length; i++) {
            if (i === index) {
                const table = tablesWithAction[i];
                const element = document.getElementById(table.getId());
                element?.scrollIntoView();
                const controlOverlay = OverlayUtil.getClosestOverlayFor(table);
                if (controlOverlay) {
                    controlOverlay.setSelected(true);
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
        }

        return [];
    }
}
