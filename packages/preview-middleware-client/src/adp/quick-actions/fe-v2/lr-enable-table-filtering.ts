import SmartTable from 'sap/ui/comp/smarttable/SmartTable';

import type FlexCommand from 'sap/ui/rta/command/FlexCommand';

import { QuickActionContext, SimpleQuickActionDefinition } from '../../../cpe/quick-actions/quick-action-definition';
import { getRelevantControlFromActivePage, pageHasControlId } from '../../../cpe/quick-actions/utils';
import { GRID_TABLE_TYPE, M_TABLE_TYPE, SMART_TABLE_TYPE, TREE_TABLE_TYPE } from '../control-types';
import { areManifestChangesSupported, prepareManifestChange } from './utils';

import { SimpleQuickActionDefinitionBase } from '../simple-quick-action-base';
import { isA } from '../../../utils/core';

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
        super(ENABLE_TABLE_FILTERING, CONTROL_TYPES, 'QUICK_ACTION_ENABLE_TABLE_FILTERING', context, [
            {
                run: () => {
                    if (this.control) {
                        const id = (this.control.getProperty('persistencyKey') as unknown) ?? this.control.getId();
                        if (typeof id !== 'string') {
                            throw new Error(
                                'Could not retrieve configuration property because control id is not valid!'
                            );
                        }
                        const value = this.context.changeService.getConfigurationPropertyValue(
                            id,
                            'enableTableFilterInPageVariant'
                        );
                        const isFilterEnabled: boolean =
                            value === undefined
                                ? (this.control.data('p13nDialogSettings')?.filter?.visible as boolean)
                                : (value as boolean);
                        if (isFilterEnabled) {
                            return {
                                type: 'error',
                                message: this.context.resourceBundle.getText(
                                    'TABLE_FILTERING_CHANGE_HAS_ALREADY_BEEN_MADE'
                                )
                            };
                        }
                    }
                    return undefined;
                }
            }
        ]);
    }
    readonly forceRefreshAfterExecution = true;
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
                const isActionApplicable = pageHasControlId(this.context.view, table.getId());
                if (isActionApplicable) {
                    this.control = table;
                    break;
                }
            }
        }
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

        return command;
    }
}
