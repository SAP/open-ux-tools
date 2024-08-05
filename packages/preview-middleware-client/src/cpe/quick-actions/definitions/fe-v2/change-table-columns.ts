import OverlayUtil from 'sap/ui/dt/OverlayUtil';
import Component from 'sap/ui/core/Component';
import FlexCommand from 'sap/ui/rta/command/FlexCommand';

import { NESTED_QUICK_ACTION_KIND, NestedQuickAction } from '@sap-ux-private/control-property-editor-common';
import { NestedQuickActionChild, OutlineNode } from '@sap-ux-private/control-property-editor-common';

import { QuickActionContext, NestedQuickActionDefinition } from '../quick-action-definition';
import { getCurrentActivePages, getRelevantControlFromActivePage } from '../../utils';
import SmartTable from 'sap/ui/comp/smarttable/SmartTable';

export const CHANGE_TABLE_COLUMNS = 'change-table-columns';
const ACTION_ID = 'CTX_COMP_VARIANT_CONTENT';
const CONTROL_TYPE = 'sap.ui.comp.smarttable.SmartTable';

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
            for (const smartTable of getRelevantControlFromActivePage(this.context, activePage, [CONTROL_TYPE])) {
                const actions = await this.context.actionService.get(smartTable.getId());
                const changeColumnAction = actions.find((action) => action.id === ACTION_ID);
                if (changeColumnAction) {
                    this.children.push({
                        label: `'${(smartTable as SmartTable).getHeader()}' Table`,
                        children: []
                    });
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
            title: 'Change Table Columns',
            children: this.children
        };
    }

    async execute(path: string): Promise<FlexCommand[]> {
        const activePages = getCurrentActivePages(this.context.controlIndex);
        const index = this.tableMap[path];
        for (const activePage of activePages) {
            const smartTables = getRelevantControlFromActivePage(this.context, activePage, [CONTROL_TYPE]);
            for (let i = 0; i < smartTables.length; i++) {
                if (i === index) {
                    const section = sap.ui.getCore().byId(smartTables[i].getId());
                    const controlOverlay = OverlayUtil.getClosestOverlayFor(section);
                    if (controlOverlay) {
                        controlOverlay.setSelected(true);
                    }
                    await this.context.actionService.execute(smartTables[i].getId(), ACTION_ID);
                }
            }
        }
        return [];
    }
}
