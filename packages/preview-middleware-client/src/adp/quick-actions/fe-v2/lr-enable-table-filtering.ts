import FlexCommand from 'sap/ui/rta/command/FlexCommand';
import { QuickActionContext, SimpleQuickActionDefinition } from '../../../cpe/quick-actions/quick-action-definition';
import { getRelevantControlFromActivePage, pageHasControlId } from '../../../cpe/quick-actions/utils';
import {
    GRID_TABLE_TYPE,
    M_TABLE_TYPE,
    SMART_TABLE_TYPE,
    TREE_TABLE_TYPE
} from '../table-quick-action-base';
import { isUnsupportedUI5Version, executeToggleAction } from './utils';
import { translateText } from '../../quick-actions/utils';
import { SimpleQuickActionDefinitionBase } from '../simple-quick-action-base';

export const ENABLE_TABLE_FILTERING = 'enable-table-filtering';

const CONTROL_TYPES = [SMART_TABLE_TYPE, M_TABLE_TYPE, TREE_TABLE_TYPE, GRID_TABLE_TYPE];

/**
 * Quick Action for enabling table filtering using table personalization settings.
 */
export class EnableTableFilteringQuickAction
    extends SimpleQuickActionDefinitionBase
    implements SimpleQuickActionDefinition {
    constructor(context: QuickActionContext) {
        super(ENABLE_TABLE_FILTERING, CONTROL_TYPES, 'QUICK_ACTION_ENABLE_TABLE_FILTERING', context);
    }
    isActive: boolean;
    readonly forceRefreshAfterExecution = true;
    isTableFilteringInPageVariantEnabled = false;
    lsTableMap: Record<string, number> = {};
    async initialize(): Promise<void> {
        const isUI5VersionNotSupported = await isUnsupportedUI5Version();
        if (isUI5VersionNotSupported) {
            return;
        }

        const tooltipText = await translateText(`THE_CHANGE_HAS_ALREADY_BEEN_MADE`);
        for (const table of getRelevantControlFromActivePage(
            this.context.controlIndex,
            this.context.view,
            CONTROL_TYPES
        )) {
            if (table) {
                const isFilterEnabled = table.data('p13nDialogSettings').filter.visible;
                const isActionApplicable = pageHasControlId(this.context.view, table.getId());
                if (isActionApplicable) {
                    this.isDisabled = isFilterEnabled;
                    this.tooltip = isFilterEnabled ? tooltipText : undefined;
                    this.control = table;
                    this.isTableFilteringInPageVariantEnabled = isFilterEnabled;
                }
            }
        }

        return Promise.resolve();
    }


    async execute(): Promise<FlexCommand[]> {

        if (!this.control) {
            return [];
        }
        const command = await executeToggleAction(
            this.context,
            'component/settings',
            this.control,
            {
                enableTableFilterInPageVariant: !this.isTableFilteringInPageVariantEnabled
            }
        );
        if (command.length) {
            this.isTableFilteringInPageVariantEnabled = !this.isTableFilteringInPageVariantEnabled;
        }
        return command;
    }
}
