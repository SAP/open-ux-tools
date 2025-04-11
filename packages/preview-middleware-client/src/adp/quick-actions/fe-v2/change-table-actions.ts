import FlexCommand from 'sap/ui/rta/command/FlexCommand';

import { QuickActionContext, NestedQuickActionDefinition } from '../../../cpe/quick-actions/quick-action-definition';
import { getControlById } from '../../../utils/core';
import { TableQuickActionDefinitionBase } from '../table-quick-action-base';
import { NestedQuickActionChild } from '@sap-ux-private/control-property-editor-common';
import { SMART_TABLE_TYPE } from '../control-types';
import { DIALOG_ENABLEMENT_VALIDATOR } from '../dialog-enablement-validator';

export const CHANGE_TABLE_ACTIONS = 'change-table-actions';
const CONTROL_TYPES = [SMART_TABLE_TYPE];

export class ChangeTableActionsQuickAction
    extends TableQuickActionDefinitionBase
    implements NestedQuickActionDefinition
{
    constructor(context: QuickActionContext) {
        super(
            CHANGE_TABLE_ACTIONS,
            CONTROL_TYPES,
            'V2_QUICK_ACTION_CHANGE_TABLE_ACTIONS',
            context,
            {
                includeServiceAction: true
            },
            [DIALOG_ENABLEMENT_VALIDATOR]
        );
    }

    async initialize(): Promise<void> {
        const processChild = (child: NestedQuickActionChild, mapKey: string) => {
            const tableAction = this.tableMap[mapKey]?.changeToolbarContentAction;
            child.enabled = !!tableAction?.enabled;
            child.tooltip = child.enabled
                ? undefined
                : this.context.resourceBundle.getText('TABLE_HEADER_TOOLBAR_NOT_CHANGEABLE');
            child.children.forEach((nestedChild, idx) => processChild(nestedChild, `${mapKey}/${idx}`));
        };

        await super.initialize();

        // disable nested actions based on conditions
        this.children.forEach((nestedChild, idx) => processChild(nestedChild, `${idx}`));
    }

    async execute(path: string): Promise<FlexCommand[]> {
        const { table, iconTabBarFilterKey, changeToolbarContentAction, sectionInfo } = this.tableMap[path];
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
        if (changeToolbarContentAction) {
            await this.context.actionService.execute(table.getId(), changeToolbarContentAction.id);
        }

        return [];
    }
}
