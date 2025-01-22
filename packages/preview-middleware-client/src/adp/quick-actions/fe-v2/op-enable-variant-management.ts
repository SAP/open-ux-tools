import FlexCommand from 'sap/ui/rta/command/FlexCommand';

import { QuickActionContext, NestedQuickActionDefinition } from '../../../cpe/quick-actions/quick-action-definition';
import { TableQuickActionDefinitionBase } from '../table-quick-action-base';
import { SMART_TABLE_TYPE } from '../control-types';

import { NestedQuickActionChild } from '@sap-ux-private/control-property-editor-common';
import { areManifestChangesSupported, prepareManifestChange } from './utils';
import { preprocessActionExecution } from './create-table-custom-column';
import SmartTable from 'sap/ui/comp/smarttable/SmartTable';
import UI5Element from 'sap/ui/core/Element';
import SmartTableExtended from 'sap/ui/comp/smarttable';

export const ENABLE_VARIANT_MANAGEMENT_IN_TABLES_CHARTS = 'enable-variant-management-in-tables-charts';

const CONTROL_TYPES = [SMART_TABLE_TYPE];

const OBJECT_PAGE_COMPONENT_NAME = 'sap.suite.ui.generic.template.ObjectPage';

export class EnableObjectPageVariantManagementQuickAction
    extends TableQuickActionDefinitionBase
    implements NestedQuickActionDefinition
{
    readonly forceRefreshAfterExecution = true;

    constructor(context: QuickActionContext) {
        super(
            ENABLE_VARIANT_MANAGEMENT_IN_TABLES_CHARTS,
            CONTROL_TYPES,
            'QUICK_ACTION_ENABLE_TABLES_AND_VARIANT_MANAGEMENT',
            context
        );
    }

    async initialize(): Promise<void> {
        if (!(await areManifestChangesSupported(this.context.manifest))) {
            this.isApplicable = false;
            return;
        }

        await super.initialize();

        const processChild = (child: NestedQuickActionChild, mapKey: string) => {
            const alreadyEnabledTooltip = this.context.resourceBundle.getText(
                'VARIANT_MANAGEMENT_FOR_TABLE_CONTROLS_IS_ALREADY_ENABLED',
                [child.label]
            );
            const table = this.tableMap[mapKey]?.table;

            if (table) {
                const id = table.getId();
                if (typeof id !== 'string') {
                    throw new Error('Could not retrieve configuration property because control id is not valid!');
                }
                let value = this.context.changeService.getConfigurationPropertyValue(id, 'variantManagement');
                if (value === undefined) {
                    value = !!(table as SmartTableExtended).getVariantManagement();
                }
                const hasItems = !!(table as SmartTable).getTable().getBindingInfo('items');

                if (value || !hasItems) {
                    child.enabled = false;
                    child.tooltip = hasItems ? alreadyEnabledTooltip : undefined;
                }
            }
            child.children.forEach((nestedChild, idx) => processChild(nestedChild, `${mapKey}/${idx.toFixed(0)}`));
        };
        this.children.forEach((nestedChild, idx) => processChild(nestedChild, `${idx.toFixed(0)}`));
    }

    async execute(path: string): Promise<FlexCommand[]> {
        const { table, sectionInfo, iconTabBarFilterKey } = this.tableMap[path];
        if (!table) {
            throw Error('Internal error. Table element not found');
        }

        const entitySet = this.context.view.getParent()?.getProperty('entitySet') as string | undefined;
        if (!entitySet) {
            throw Error('Internal error. Object Page entity set not found');
        }

        preprocessActionExecution(table, sectionInfo, this.iconTabBar, iconTabBarFilterKey);
        this.selectOverlay(table);

        const commands = await prepareManifestChange(
            this.context,
            `component/settings/sections/${this.getSectionID(table)}/tableSettings`,
            table,
            OBJECT_PAGE_COMPONENT_NAME,
            entitySet,
            {
                'variantManagement': true
            }
        );

        return commands ?? [];
    }

    getSectionID(table: UI5Element): string {
        let lineItem = 'com.sap.vocabularies.UI.v1.LineItem';
        if (table.data().lineItemQualifier) {
            lineItem = `${lineItem}#${table.data().lineItemQualifier}`;
        }
        const navSegment = (table as SmartTable).getTable().getBindingInfo('items').path ?? '';
        return `${navSegment ? navSegment + '::' : ''}${lineItem}`;
    }
}
