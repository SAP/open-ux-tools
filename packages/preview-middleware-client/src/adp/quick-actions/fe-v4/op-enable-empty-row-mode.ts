import FlexCommand from 'sap/ui/rta/command/FlexCommand';

import { NestedQuickActionDefinition, QuickActionContext } from '../../../cpe/quick-actions/quick-action-definition';
import Table from 'sap/ui/mdc/Table';
import { getRelevantControlFromActivePage } from '../../../cpe/quick-actions/utils';
import { createManifestPropertyChange } from '../../../utils/fe-v4';
import { getUi5Version, isLowerThanMinimalUi5Version } from '../../../utils/version';
import { ANALYTICAL_TABLE_TYPE, GRID_TABLE_TYPE, MDC_TABLE_TYPE, TREE_TABLE_TYPE } from '../control-types';
import { TableQuickActionDefinitionBase } from './table-quick-action-base';
import { isA } from '../../../utils/core';
import { getTooltipsForTableEmptyRowModeAction } from '../common/utils';

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

        let index = 0;
        for (const smartTable of getRelevantControlFromActivePage(
            this.context.controlIndex,
            this.context.view,
            CONTROL_TYPES
        )) {
            if (UNSUPPORTED_TABLES.some((t) => isA(t, smartTable))) {
                this.children.push({
                    label: `'${(smartTable as Table).getHeader()}' table`,
                    enabled: false,
                    tooltip: unsupportedCreationRowsTooltip,
                    children: []
                });
            } else {
                const isChildEnabled = smartTable.data('creationMode') !== INLINE_CREATION_ROWS_MODE;
                this.children.push({
                    label: `'${(smartTable as Table).getHeader()}' table`,
                    enabled: isChildEnabled,
                    tooltip: isChildEnabled ? undefined : alreadyEnabledTooltip,
                    children: []
                });
            }

            this.tableMap[`${this.children.length - 1}`] = index;
            index++;
        }

        if (this.children.length > 0) {
            this.isApplicable = true;
        }
    }

    async execute(path: string): Promise<FlexCommand[]> {
        const { flexSettings } = this.context;
        const index = this.tableMap[path];

        const smartTables = getRelevantControlFromActivePage(
            this.context.controlIndex,
            this.context.view,
            CONTROL_TYPES
        );

        const modifiedControl = smartTables[index];
        if (!modifiedControl) {
            return [];
        }
        const command = await createManifestPropertyChange(
            modifiedControl,
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
