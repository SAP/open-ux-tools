import OverlayUtil from 'sap/ui/dt/OverlayUtil';
import Component from 'sap/ui/core/Component';
import FlexCommand from 'sap/ui/rta/command/FlexCommand';

import { NESTED_QUICK_ACTION_KIND, NestedQuickAction } from '@sap-ux-private/control-property-editor-common';
import { NestedQuickActionChild, OutlineNode } from '@sap-ux-private/control-property-editor-common';

import { QuickActionContext, NestedQuickActionDefinition } from '../quick-action-definition';
import { getCurrentActivePages, getRelevantControlFromActivePage } from '../../utils';
import SmartTable from 'sap/ui/comp/smarttable/SmartTable';
import Table from 'sap/m/Table';
import ListBase from 'sap/m/ListBase';

export const CHANGE_TABLE_COLUMNS = 'change-table-columns';
const SMART_TABLE_ACTION_ID = 'CTX_COMP_VARIANT_CONTENT';
const M_TABLE_ACTION_ID = 'CTX_ADD_ELEMENTS_AS_CHILD';
const ACTION_ID = [SMART_TABLE_ACTION_ID, M_TABLE_ACTION_ID];
const CONTROL_TYPES = ['sap.ui.comp.smarttable.SmartTable', 'sap.m.Table'];

export class ChangeTableColumnsQuickAction implements NestedQuickActionDefinition {
    readonly kind = NESTED_QUICK_ACTION_KIND;
    readonly type = CHANGE_TABLE_COLUMNS;
    isActive = false;
    isClearButtonEnabled = false;
    children: NestedQuickActionChild[] = [];
    tableMap: Record<string, number> = {};
    constructor(private context: QuickActionContext) {}

    async initialize() {
        const activePages = getCurrentActivePages(this.context.controlIndex);
        for (const activePage of activePages) {
            let index = 0;
            for (const table of getRelevantControlFromActivePage(this.context, activePage, CONTROL_TYPES)) {
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
                            label: `${title}' table`,
                            children: []
                        });
                    }

                    this.tableMap[`${this.children.length - 1}`] = index;
                    index++;
                }
            }
        }
        if (this.children.length > 0) {
            this.isActive = true;
        }
    }

    getActionObject(): NestedQuickAction {
        return {
            kind: NESTED_QUICK_ACTION_KIND,
            type: this.type,
            enabled: this.isActive,
            // TODO: translate this?
            title: 'Change table columns',
            children: this.children
        };
    }

    async execute(path: string): Promise<FlexCommand[]> {
        const activePages = getCurrentActivePages(this.context.controlIndex);
        const index = this.tableMap[path];
        for (const activePage of activePages) {
            const smartTables = getRelevantControlFromActivePage(this.context, activePage, CONTROL_TYPES);
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

                    if (table?.isA('sap.ui.comp.smarttable.SmartTable')) {
                        await this.context.actionService.execute(table.getId(), SMART_TABLE_ACTION_ID);
                    }
                    if (table?.isA('sap.m.Table')) {
                        const eventHanlder = (table as ListBase).attachUpdateFinished ? 'attachUpdateFinished' : 'attachGrowingFinished';
                        if ((table as ListBase).getItems().length > 0) {
                            await this.context.actionService.execute(table.getId(), M_TABLE_ACTION_ID);
                        }
                        (table as ListBase)?.[eventHanlder](
                            async () => await this.context.actionService.execute(table.getId(), M_TABLE_ACTION_ID)
                        );
                    }
                }
            }
        }
        return [];
    }
}
