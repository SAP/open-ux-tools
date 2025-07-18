import FlexCommand from 'sap/ui/rta/command/FlexCommand';

import { QuickActionContext, NestedQuickActionDefinition } from '../../../cpe/quick-actions/quick-action-definition';
import { TableQuickActionDefinitionBase } from '../table-quick-action-base';
import { ANALYTICAL_TABLE_TYPE, SMART_TABLE_TYPE, TREE_TABLE_TYPE } from '../control-types';

import { NestedQuickActionChild } from '@sap-ux-private/control-property-editor-common';
import { areManifestChangesSupported, prepareManifestChange } from './utils';
import { getUi5Version, isLowerThanMinimalUi5Version } from '../../../utils/version';
import { isA } from '../../../utils/core';
import { getTooltipsForTableEmptyRowModeAction } from '../common/utils';
import { preprocessActionExecution } from './create-table-custom-column';

export const ENABLE_TABLE_EMPTY_ROW_MODE = 'enable-table-empty-row-mode';

const CONTROL_TYPES = [SMART_TABLE_TYPE];
const UNSUPPORTED_TABLES = [ANALYTICAL_TABLE_TYPE, TREE_TABLE_TYPE];
const CREATION_ROWS_MODE = 'creationRows';
const OBJECT_PAGE_COMPONENT_NAME = 'sap.suite.ui.generic.template.ObjectPage';

export class EnableTableEmptyRowModeQuickAction
    extends TableQuickActionDefinitionBase
    implements NestedQuickActionDefinition
{
    readonly forceRefreshAfterExecution = true;

    constructor(context: QuickActionContext) {
        super(ENABLE_TABLE_EMPTY_ROW_MODE, CONTROL_TYPES, 'QUICK_ACTION_ENABLE_TABLE_EMPTY_ROW_MODE', context);
    }

    async initialize(): Promise<void> {
        const version = await getUi5Version();
        if (!(await areManifestChangesSupported(this.context.manifest))) {
            return;
        }

        if (isLowerThanMinimalUi5Version(version, { major: 1, minor: 120, patch: 23 })) {
            this.isApplicable = false;
            return;
        }

        const { alreadyEnabledTooltip, unsupportedCreationRowsTooltip } = getTooltipsForTableEmptyRowModeAction(
            this.context.resourceBundle
        );

        const processChild = (child: NestedQuickActionChild, mapKey: string) => {
            const table = this.tableMap[mapKey]?.table;
            if (table) {
                const innerTable = this.getInternalTable(table);
                if (innerTable) {
                    if (UNSUPPORTED_TABLES.some((t) => isA(t, innerTable))) {
                        child.enabled = false;
                        child.tooltip = unsupportedCreationRowsTooltip;
                    } else if (table.data('creationMode') === CREATION_ROWS_MODE) {
                        child.enabled = false;
                        child.tooltip = alreadyEnabledTooltip;
                    }
                }
            }
            child.children.forEach((nestedChild, idx) => processChild(nestedChild, `${mapKey}/${idx.toFixed(0)}`));
        };

        await super.initialize();

        // disable nested actions based on conditions
        this.children.forEach((nestedChild, idx) => processChild(nestedChild, `${idx.toFixed(0)}`));
    }

    async execute(path: string): Promise<FlexCommand[]> {
        const { table, sectionInfo, iconTabBarFilterKey } = this.tableMap[path];
        if (!table) {
            throw Error('Internal error. Table element not found');
        }

        const sectionId = table.data('sectionId') as string | undefined | null;
        if (!sectionId) {
            throw Error('Internal error. Table sectionId property not found');
        }

        const entitySet = this.context.view.getParent()?.getProperty('entitySet') as string | undefined;
        if (!entitySet) {
            throw Error('Internal error. Object Page entity set not found');
        }

        preprocessActionExecution(table, sectionInfo, this.iconTabBar, iconTabBarFilterKey);
        this.selectOverlay(table);

        const commands = await prepareManifestChange(
            this.context,
            `component/settings/sections/${sectionId}/createMode`,
            table,
            OBJECT_PAGE_COMPONENT_NAME,
            entitySet,
            CREATION_ROWS_MODE
        );

        return commands ?? [];
    }
}
