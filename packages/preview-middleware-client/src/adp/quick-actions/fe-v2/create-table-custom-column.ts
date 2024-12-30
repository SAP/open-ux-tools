import ManagedObject from 'sap/ui/base/ManagedObject';
import UI5Element from 'sap/ui/core/Element';

import type FlexCommand from 'sap/ui/rta/command/FlexCommand';
import OverlayRegistry from 'sap/ui/dt/OverlayRegistry';

import ObjectPageSection from 'sap/uxap/ObjectPageSection';
import ObjectPageSubSection from 'sap/uxap/ObjectPageSubSection';
import ObjectPageLayout from 'sap/uxap/ObjectPageLayout';

import IconTabBar from 'sap/m/IconTabBar';

import type SmartTable from 'sap/ui/comp/smarttable/SmartTable';

import { QuickActionContext, NestedQuickActionDefinition } from '../../../cpe/quick-actions/quick-action-definition';
import { getControlById, isA } from '../../../utils/core';
import { DialogNames, DialogFactory } from '../../dialog-factory';
import { ANALYTICAL_TABLE_TYPE, GRID_TABLE_TYPE, M_TABLE_TYPE, SMART_TABLE_TYPE, TREE_TABLE_TYPE } from '../control-types';
import { TableQuickActionDefinitionBase } from '../table-quick-action-base';
import { notifyUser } from '../../utils';
import { getTextBundle } from '../../../i18n';
import { DIALOG_ENABLEMENT_VALIDATOR } from '../dialog-enablement-validator';

export const CREATE_TABLE_CUSTOM_COLUMN = 'create-table-custom-column';

const CONTROL_TYPES = [SMART_TABLE_TYPE, M_TABLE_TYPE, TREE_TABLE_TYPE, GRID_TABLE_TYPE];

/**
 * Reusable function which performs some preparation steps before table action execution
 *
 * @param table - table element
 * @param sectionInfo - section data
 * @param iconTabBar - icon tab bar element
 * @param iconTabBarFilterKey - tab bar key to select a tab
 */
export function preprocessActionExecution(
    table: UI5Element,
    sectionInfo:
        | {
              section: ObjectPageSection;
              subSection: ObjectPageSubSection;
              layout?: ObjectPageLayout;
          }
        | undefined,
    iconTabBar: IconTabBar | undefined,
    iconTabBarFilterKey: string | undefined
) {
    if (sectionInfo) {
        const { layout, section, subSection } = sectionInfo;
        layout?.setSelectedSection(section);
        section.setSelectedSubSection(subSection);
    } else {
        getControlById(table.getId())?.getDomRef()?.scrollIntoView();
    }

    if (iconTabBar && iconTabBarFilterKey) {
        iconTabBar.setSelectedKey(iconTabBarFilterKey);
    }
}

export class AddTableCustomColumnQuickAction
    extends TableQuickActionDefinitionBase
    implements NestedQuickActionDefinition
{
    constructor(context: QuickActionContext) {
        super(
            CREATE_TABLE_CUSTOM_COLUMN,
            CONTROL_TYPES,
            'QUICK_ACTION_ADD_CUSTOM_TABLE_COLUMN',
            context,
            {
                areTableRowsRequired: true
            },
            [DIALOG_ENABLEMENT_VALIDATOR]
        );
    }

    async execute(path: string): Promise<FlexCommand[]> {
        const { table, iconTabBarFilterKey, sectionInfo } = this.tableMap[path];
        if (!table) {
            return [];
        }

        preprocessActionExecution(table, sectionInfo, this.iconTabBar, iconTabBarFilterKey);
        this.selectOverlay(table);

        let tableInternal: ManagedObject | undefined = table;
        if (isA<SmartTable>(SMART_TABLE_TYPE, table)) {
            const itemsAggregation = table.getAggregation('items') as ManagedObject[];
            tableInternal = itemsAggregation.find((item) => {
                return [M_TABLE_TYPE, TREE_TABLE_TYPE, ANALYTICAL_TABLE_TYPE, GRID_TABLE_TYPE].some((tType) =>
                    isA(tType, item)
                );
            });
            if (!tableInternal) {
                return [];
            }
        }

        const overlay = OverlayRegistry.getOverlay(tableInternal as UI5Element) || [];
        if (!overlay) {
            return [];
        }

        if (
            isA(M_TABLE_TYPE, tableInternal) &&
            (tableInternal.getAggregation('items') as ManagedObject[]).length === 0
        ) {
            const bundle = await getTextBundle();
            notifyUser(bundle.getText('TABLE_ROWS_NEEDED_TO_CREATE_CUSTOM_COLUMN'), 8000);
            return [];
        }
        const dialog = [TREE_TABLE_TYPE, ANALYTICAL_TABLE_TYPE, GRID_TABLE_TYPE].some((type) =>
            isA(type, tableInternal)
        )
            ? DialogNames.ADD_FRAGMENT
            : DialogNames.ADD_TABLE_COLUMN_FRAGMENTS;
        await DialogFactory.createDialog(overlay, this.context.rta, dialog, undefined, {
            aggregation: 'columns',
            title: 'QUICK_ACTION_ADD_CUSTOM_TABLE_COLUMN'
        });

        return [];
    }
}
