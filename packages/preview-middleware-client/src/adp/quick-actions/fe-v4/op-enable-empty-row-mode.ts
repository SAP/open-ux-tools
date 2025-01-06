import FlexCommand from 'sap/ui/rta/command/FlexCommand';

import { NestedQuickActionDefinition, QuickActionContext } from '../../../cpe/quick-actions/quick-action-definition';
import { createManifestPropertyChange } from '../../../utils/fe-v4';
import { getUi5Version, isLowerThanMinimalUi5Version } from '../../../utils/version';
import { ANALYTICAL_TABLE_TYPE, GRID_TABLE_TYPE, MDC_TABLE_TYPE, TREE_TABLE_TYPE } from '../control-types';
import { TableQuickActionDefinitionBase } from '../table-quick-action-base';
import { isA } from '../../../utils/core';
import { getTooltipsForTableEmptyRowModeAction } from '../common/utils';
import { NestedQuickActionChild } from '@sap-ux-private/control-property-editor-common';
import { preprocessActionExecution } from '../fe-v2/create-table-custom-column';

export const ENABLE_TABLE_EMPTY_ROW_MODE = 'enable-table-empty-row-mode';
const CONTROL_TYPES = [MDC_TABLE_TYPE, GRID_TABLE_TYPE, ANALYTICAL_TABLE_TYPE, TREE_TABLE_TYPE];
const UNSUPPORTED_TABLES = [ANALYTICAL_TABLE_TYPE, TREE_TABLE_TYPE];

const INLINE_CREATION_ROWS_MODE = 'InlineCreationRows';
/**
 * Quick Action for enabling table filtering using table personalization settings.
 */
export class EnableTableEmptyRowModeQuickAction
    extends TableQuickActionDefinitionBase
    implements NestedQuickActionDefinition
{
    constructor(context: QuickActionContext) {
        super(ENABLE_TABLE_EMPTY_ROW_MODE, CONTROL_TYPES, 'QUICK_ACTION_ENABLE_TABLE_EMPTY_ROW_MODE', context);
    }
    readonly forceRefreshAfterExecution = true;

    async initialize(): Promise<void> {
        const version = await getUi5Version();
        if (isLowerThanMinimalUi5Version(version, { major: 1, minor: 131 })) {
            this.isApplicable = false;
            return;
        }

        const { alreadyEnabledTooltip, unsupportedCreationRowsTooltip } = getTooltipsForTableEmptyRowModeAction(
            this.context.resourceBundle
        );

        const processChild = (child: NestedQuickActionChild, mapKey: string) => {
            const table = this.tableMap[mapKey]?.table;
            if (table) {
                if (UNSUPPORTED_TABLES.some((t) => isA(t, table))) {
                    child.enabled = false;
                    child.tooltip = unsupportedCreationRowsTooltip;
                } else if (table.data('creationMode') === INLINE_CREATION_ROWS_MODE) {
                    child.enabled = false;
                    child.tooltip = alreadyEnabledTooltip;
                }
            }
            child.children.forEach((nestedChild, idx) => processChild(nestedChild, `${mapKey}/${idx.toFixed(0)}`));
        };

        await super.initialize();

        // disable nested actions based on conditions
        this.children.forEach((nestedChild, idx) => processChild(nestedChild, `${idx.toFixed(0)}`));
    }

    async execute(path: string): Promise<FlexCommand[]> {
        const { flexSettings } = this.context;
        const { table, sectionInfo, iconTabBarFilterKey } = this.tableMap[path];
        if (!table) {
            return [];
        }

        preprocessActionExecution(table, sectionInfo, this.iconTabBar, iconTabBarFilterKey);
        this.selectOverlay(table);

        const command = await createManifestPropertyChange(
            table,
            flexSettings,
            {
                name: INLINE_CREATION_ROWS_MODE
            },
            ['creationMode']
        );
        if (command) {
            return [command];
        } else {
            return [];
        }
    }
}
