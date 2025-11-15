import ManagedObject from 'sap/ui/base/ManagedObject';
import UI5Element from 'sap/ui/core/Element';

import type FlexCommand from 'sap/ui/rta/command/FlexCommand';
import OverlayRegistry from 'sap/ui/dt/OverlayRegistry';

import ObjectPageSection from 'sap/uxap/ObjectPageSection';
import ObjectPageSubSection from 'sap/uxap/ObjectPageSubSection';
import ObjectPageLayout from 'sap/uxap/ObjectPageLayout';

import IconTabBar from 'sap/m/IconTabBar';

import { QuickActionContext, NestedQuickActionDefinition } from '../../../cpe/quick-actions/quick-action-definition';
import { getControlById, isA } from '../../../utils/core';
import { DialogNames, DialogFactory } from '../../dialog-factory';
import {
    ANALYTICAL_TABLE_TYPE,
    GRID_TABLE_TYPE,
    M_TABLE_TYPE,
    SMART_TABLE_TYPE,
    TREE_TABLE_TYPE
} from '../control-types';
import { TableQuickActionDefinitionBase } from '../table-quick-action-base';
import { DIALOG_ENABLEMENT_VALIDATOR } from '../dialog-enablement-validator';
import { MessageBarType } from '@sap-ux-private/control-property-editor-common';
import { sendInfoCenterMessage } from '../../../utils/info-center-message';

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

        const tableInternal = this.getInternalTable(table);
        if (!tableInternal) {
            return [];
        }

        const overlay = OverlayRegistry.getOverlay(tableInternal);
        if (!overlay) {
            return [];
        }

        if (
            isA(M_TABLE_TYPE, tableInternal) &&
            (tableInternal.getAggregation('items') as ManagedObject[]).length === 0
        ) {
            await sendInfoCenterMessage({
                title: { key: 'ADP_CREATE_XML_FRAGMENT_TITLE' },
                description: { key: 'TABLE_ROWS_NEEDED_TO_CREATE_CUSTOM_COLUMN' },
                type: MessageBarType.error
            });
            return [];
        }
        const dialog =
            isA(TREE_TABLE_TYPE, tableInternal) ||
            isA(ANALYTICAL_TABLE_TYPE, tableInternal) ||
            isA(GRID_TABLE_TYPE, tableInternal)
                ? DialogNames.ADD_FRAGMENT
                : DialogNames.ADD_TABLE_COLUMN_FRAGMENTS;
        await DialogFactory.createDialog(
            overlay,
            this.context.rta,
            dialog,
            undefined,
            {
                aggregation: 'columns',
                title: 'QUICK_ACTION_ADD_CUSTOM_TABLE_COLUMN'
            },
            { actionName: this.type, telemetryEventIdentifier: this.getTelemetryIdentifier() }
        );

        return [];
    }
}
