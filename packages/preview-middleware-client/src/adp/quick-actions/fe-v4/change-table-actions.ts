import OverlayUtil from 'sap/ui/dt/OverlayUtil';
import FlexCommand from 'sap/ui/rta/command/FlexCommand';
import UI5Element from 'sap/ui/core/Element';
import { QuickActionContext, NestedQuickActionDefinition } from '../../../cpe/quick-actions/quick-action-definition';
import { getControlById, findNestedElements } from '../../../utils/core';
import { TableQuickActionDefinitionBase } from '../table-quick-action-base';
import { MDC_ACTION_TOOLBAR_TYPE, MDC_TABLE_TYPE } from '../control-types';
import { getRelevantControlFromActivePage } from '../../../cpe/quick-actions/utils';
import { NestedQuickActionChild } from '@sap-ux-private/control-property-editor-common';
import { preprocessActionExecution } from '../fe-v2/create-table-custom-column';
import { DIALOG_ENABLEMENT_VALIDATOR } from '../dialog-enablement-validator';

export const CHANGE_TABLE_ACTIONS = 'change-table-actions';
const ACTION_ID = 'CTX_SETTINGS';

/**
 * Quick Action for changing table columns.
 */
export class ChangeTableActionsQuickAction
    extends TableQuickActionDefinitionBase
    implements NestedQuickActionDefinition
{
    public toolbarsMap: Record<string, UI5Element | undefined> = {};

    constructor(context: QuickActionContext) {
        super(CHANGE_TABLE_ACTIONS, [MDC_TABLE_TYPE], 'V4_QUICK_ACTION_CHANGE_TABLE_ACTIONS', context, undefined, [
            DIALOG_ENABLEMENT_VALIDATOR
        ]);
    }

    async initialize(): Promise<void> {
        const toolbars = getRelevantControlFromActivePage(this.context.controlIndex, this.context.view, [
            MDC_ACTION_TOOLBAR_TYPE
        ]);

        const processChild = async (child: NestedQuickActionChild, mapKey: string) => {
            const mapEntry = this.tableMap[mapKey];
            if (mapEntry) {
                const tableToolbar = findNestedElements(mapEntry.table, toolbars)[0];
                this.toolbarsMap[mapKey] = tableToolbar;
                const actions = tableToolbar ? await this.context.actionService.get(tableToolbar.getId()) : [];
                const changeToolbarContentAction = actions.find((action) => action.id === ACTION_ID);

                child.enabled = !!changeToolbarContentAction?.enabled;
                let tooltip: string | undefined;
                if (!tableToolbar) {
                    tooltip = this.context.resourceBundle.getText('TABLE_HEADER_TOOLBAR_NOT_AVAILABLE');
                } else if (!child.enabled) {
                    tooltip = this.context.resourceBundle.getText('TABLE_HEADER_TOOLBAR_NOT_CHANGEABLE');
                }
                child.tooltip = tooltip ?? child.tooltip;
            }
            for (let idx = 0; idx < child.children.length; idx++) {
                await processChild(child.children[idx], `${mapKey}/${idx}`);
            }
        };

        await super.initialize();

        // disable nested actions based on conditions
        for (let idx = 0; idx < this.children.length; idx++) {
            await processChild(this.children[idx], `${idx}`);
        }
    }

    async execute(path: string): Promise<FlexCommand[]> {
        const { table, sectionInfo, iconTabBarFilterKey } = this.tableMap[path];
        const toolbar = this.toolbarsMap[path];
        if (!table || !toolbar) {
            return [];
        }
        preprocessActionExecution(table, sectionInfo, this.iconTabBar, iconTabBarFilterKey);
        const toolbarControl = getControlById(toolbar.getId());
        const controlOverlay = OverlayUtil.getClosestOverlayFor(toolbarControl);
        if (controlOverlay) {
            controlOverlay.setSelected(true);
            await this.context.actionService.execute(toolbar.getId(), ACTION_ID);
        }
        return [];
    }
}
