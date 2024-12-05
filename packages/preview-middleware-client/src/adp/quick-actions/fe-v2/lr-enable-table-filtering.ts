import FlexCommand from 'sap/ui/rta/command/FlexCommand';
import { QuickActionContext, SimpleQuickActionDefinition } from '../../../cpe/quick-actions/quick-action-definition';
import { getRelevantControlFromActivePage, pageHasControlId } from '../../../cpe/quick-actions/utils';
import { GRID_TABLE_TYPE, M_TABLE_TYPE, SMART_TABLE_TYPE, TREE_TABLE_TYPE } from '../table-quick-action-base';
import { areManifestChangesSupported, prepareManifestChange } from './utils';

import { SimpleQuickActionDefinitionBase } from '../simple-quick-action-base';
import { isA } from '../../../utils/core';
import SmartTable from 'sap/ui/comp/smarttable/SmartTable';
const COMPONENT = 'sap.suite.ui.generic.template.ListReport';

export const ENABLE_TABLE_FILTERING = 'enable-table-filtering';

const CONTROL_TYPES = [SMART_TABLE_TYPE, M_TABLE_TYPE, TREE_TABLE_TYPE, GRID_TABLE_TYPE];

/**
 * Quick Action for enabling table filtering using table personalization settings.
 */
export class EnableTableFilteringQuickAction
    extends SimpleQuickActionDefinitionBase
    implements SimpleQuickActionDefinition
{
    constructor(context: QuickActionContext) {
        super(ENABLE_TABLE_FILTERING, CONTROL_TYPES, 'QUICK_ACTION_ENABLE_TABLE_FILTERING', context);
    }
    isActive: boolean;
    readonly forceRefreshAfterExecution = true;
    lsTableMap: Record<string, number> = {};
    public get tooltip(): string | undefined {
        return this.isDisabled ? this.context.resourceBundle.getText('TABLE_FILTERING_CHANGE_HAS_ALREADY_BEEN_MADE') : undefined;
    }

    async initialize(): Promise<void> {
        const manifestChangesSupported = await areManifestChangesSupported(this.context.manifest);
        if (!manifestChangesSupported) {
            return;
        }
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
                    this.control = table;
                    break;
                }
            }
        }

        return Promise.resolve();
    }

    async execute(): Promise<FlexCommand[]> {
        if (!this.control) {
            return [];
        }

        const entitySet = isA<SmartTable>(SMART_TABLE_TYPE, this.control) ? this.control.getEntitySet() : undefined;
        const command = await prepareManifestChange(
            this.context,
            'component/settings',
            this.control,
            COMPONENT,
            entitySet,
            {
                enableTableFilterInPageVariant: !this.isDisabled
            }
        );

        this.isDisabled = !this.isDisabled;

        return command;
    }
}
