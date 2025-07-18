import FlexCommand from 'sap/ui/rta/command/FlexCommand';
import type Table from 'sap/m/Table';
import type SmartTable from 'sap/ui/comp/smarttable/SmartTable';
import ManagedObject from 'sap/ui/base/ManagedObject';

import { QuickActionContext, NestedQuickActionDefinition } from '../../../cpe/quick-actions/quick-action-definition';
import { getControlById, isA } from '../../../utils/core';
import { TableQuickActionDefinitionBase } from '../table-quick-action-base';
import { DIALOG_ENABLEMENT_VALIDATOR } from '../dialog-enablement-validator';

export const CHANGE_TABLE_COLUMNS = 'change-table-columns';
const SMART_TABLE_TYPE = 'sap.ui.comp.smarttable.SmartTable';
const M_TABLE_TYPE = 'sap.m.Table';
// maintain order if action id
const CONTROL_TYPES = [SMART_TABLE_TYPE, M_TABLE_TYPE, 'sap.ui.table.TreeTable', 'sap.ui.table.Table'];

export class ChangeTableColumnsQuickAction
    extends TableQuickActionDefinitionBase
    implements NestedQuickActionDefinition
{
    constructor(context: QuickActionContext) {
        super(
            CHANGE_TABLE_COLUMNS,
            CONTROL_TYPES,
            'V2_QUICK_ACTION_CHANGE_TABLE_COLUMNS',
            context,
            {
                includeServiceAction: true
            },
            [DIALOG_ENABLEMENT_VALIDATOR]
        );
    }
    async execute(path: string): Promise<FlexCommand[]> {
        const { table, iconTabBarFilterKey, changeColumnActionId, sectionInfo } = this.tableMap[path];
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
        if (changeColumnActionId) {
            const executeAction = async () =>
                await this.context.actionService.execute(table.getId(), changeColumnActionId);
            if (isA<SmartTable>(SMART_TABLE_TYPE, table)) {
                await executeAction();
            } else if (isA<Table>(M_TABLE_TYPE, table)) {
                // if table is busy, i.e. lazy loading, then we subscribe to 'updateFinished' event and call action service when loading is done
                // to avoid reopening the dialog after close
                if (this.isTableLoaded(table)) {
                    await executeAction();
                } else {
                    table.attachEventOnce('updateFinished', executeAction, this);
                }
            }
        }

        return [];
    }

    private isAbsoluteAggregationBinding(element: ManagedObject, aggregationName: string): boolean {
        const mBindingInfo = element.getBindingInfo(aggregationName);
        const path = mBindingInfo?.path;
        if (!path) {
            return false;
        }
        return path.indexOf('/') === 0;
    }

    /**
     * Checks if table is loaded and has binding context available.
     * This is needed to properly render change columns dialog.
     * Based on {@link https://github.com/SAP/openui5/blob/rel-1.127/src/sap.ui.fl/src/sap/ui/fl/write/_internal/delegates/ODataV2ReadDelegate.js#L269-L271| ODataV2ReadDelegate.getPropertyInfo}.
     *
     * @param element - Table control.
     * @returns True if binding context is available.
     */
    private isTableLoaded(element: ManagedObject): boolean {
        const aggregationName = 'items';
        if (this.isAbsoluteAggregationBinding(element, aggregationName)) {
            const bindingInfo = element.getBindingInfo(aggregationName);
            // check to be default model binding otherwise return undefined
            if (typeof bindingInfo.model === 'string' && bindingInfo.model !== '') {
                return false;
            }
            return bindingInfo.path !== undefined;
        } else {
            // here we explicitly request the default models binding context
            const bindingContext = element.getBindingContext();
            return !!bindingContext;
        }
    }
}
