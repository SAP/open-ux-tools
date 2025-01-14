import FlexCommand from 'sap/ui/rta/command/FlexCommand';

import { QuickActionContext, NestedQuickActionDefinition } from '../../../cpe/quick-actions/quick-action-definition';
import { TableQuickActionDefinitionBase } from '../table-quick-action-base';
import { SMART_TABLE_TYPE } from '../control-types';

import { NestedQuickActionChild } from '@sap-ux-private/control-property-editor-common';
import { areManifestChangesSupported, prepareManifestChange } from './utils';
import { getUi5Version, isLowerThanMinimalUi5Version } from '../../../utils/version';
import { preprocessActionExecution } from './create-table-custom-column';
import SmartTable from 'sap/ui/comp/smarttable/SmartTable';

export const ENABLE_TABLE_EMPTY_ROW_MODE = 'enable-table-empty-row-mode';

const CONTROL_TYPES = [SMART_TABLE_TYPE];
// const UNSUPPORTED_TABLES = [ANALYTICAL_TABLE_TYPE, TREE_TABLE_TYPE];
const OBJECT_PAGE_COMPONENT_NAME = 'sap.suite.ui.generic.template.ObjectPage';

type SmartTableExtended = SmartTable & {
    getVariantManagement: () => boolean;
    getEntitySet: () => string;
};

export class EnableObjectPageVariantManagementQuickAction
    extends TableQuickActionDefinitionBase
    implements NestedQuickActionDefinition
{
    readonly forceRefreshAfterExecution = true;
    private targetType: 'Table' | 'Chart' = 'Table';

    constructor(context: QuickActionContext) {
        super(
            ENABLE_TABLE_EMPTY_ROW_MODE,
            CONTROL_TYPES,
            'QUICK_ACTION_ENABLE_TABLES_AND_CHARTS_VARIANT_MANAGEMENT',
            context
        );
    }

    async initialize(): Promise<void> {
        const version = await getUi5Version();
        if (!(await areManifestChangesSupported(this.context.manifest))) {
            this.isApplicable = false;
            return;
        }

        if (isLowerThanMinimalUi5Version(version, { major: 1, minor: 120, patch: 23 })) {
            this.isApplicable = false;
            return;
        }

        await super.initialize();

        const alreadyEnabledTooltip = this.context.resourceBundle.getText(
            'VARIANT_MANAGEMENT_FOR_PAGE_CONTROLS_IS_ALREADY_ENABLED'
        );
        const processChild = (child: NestedQuickActionChild, mapKey: string) => {
            const table = this.tableMap[mapKey]?.table;
            if (table) {
                if (table) {
                    if ((table as SmartTableExtended).getVariantManagement() !== undefined) {
                        // child.enabled = false;
                        child.tooltip = alreadyEnabledTooltip;
                    }
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

        const navSegment = (table as SmartTable).getTable().getBindingInfo('items').path ?? '';
        const sectionId = `${navSegment ? navSegment + '::' : ''}com.sap.vocabularies.UI.v1.LineItem`; // TODO: qualifier?

        const commands = await prepareManifestChange(
            this.context,
            `component/settings/sections/${sectionId}/tableSettings`,
            table,
            OBJECT_PAGE_COMPONENT_NAME,
            entitySet,
            {
                'variantManagement': false
            }
        );

        return commands ?? [];
    }
}
