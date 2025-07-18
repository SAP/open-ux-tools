import FlexCommand from 'sap/ui/rta/command/FlexCommand';
import FilterBar from 'sap/ui/mdc/FilterBar';

import { QuickActionContext, SimpleQuickActionDefinition } from '../../../cpe/quick-actions/quick-action-definition';
import { pageHasControlId } from '../../../cpe/quick-actions/utils';
import { getControlById } from '../../../utils/core';
import { executeToggleAction } from './utils';
import { SimpleQuickActionDefinitionBase } from '../simple-quick-action-base';

export const ENABLE_SEMANTIC_DATE_RANGE = 'enable-semantic-date-range';
const PROPERTY_NAME = 'useSemanticDateRange';
const PROPERTY_PATH = `controlConfiguration/@com.sap.vocabularies.UI.v1.SelectionFields/${PROPERTY_NAME}`;
const CONTROL_TYPE = 'sap.fe.macros.controls.FilterBar';
const boolMap: { [key: string]: boolean } = {
    'true': true,
    'false': false
};
/**
 * Quick Action for toggling the visibility of "Semantic date range" for filter bar fields in LR.
 */
export class ToggleSemanticDateRangeFilterBar
    extends SimpleQuickActionDefinitionBase
    implements SimpleQuickActionDefinition
{
    constructor(context: QuickActionContext) {
        super(ENABLE_SEMANTIC_DATE_RANGE, [], '', context);
    }
    readonly forceRefreshAfterExecution = true;
    private isUseDateRangeTypeEnabled = false;

    initialize(): Promise<void> {
        const controls = this.context.controlIndex[CONTROL_TYPE] ?? [];
        for (const control of controls) {
            const isActionApplicable = pageHasControlId(this.context.view, control.controlId);
            const filterBar = getControlById<FilterBar>(control.controlId);
            if (isActionApplicable && filterBar) {
                this.control = filterBar;
                const value = this.context.changeService.getConfigurationPropertyValue(
                    control.controlId,
                    PROPERTY_NAME
                );
                this.isUseDateRangeTypeEnabled =
                    value === undefined ? boolMap[this.control.data('useSemanticDateRange')] : (value as boolean);
            }
        }
        return Promise.resolve();
    }

    protected get textKey() {
        return this.isUseDateRangeTypeEnabled
            ? 'QUICK_ACTION_LR_DISABLE_SEMANTIC_DATE_RANGE_FILTER_BAR'
            : 'QUICK_ACTION_LR_ENABLE_SEMANTIC_DATE_RANGE_FILTER_BAR';
    }

    async execute(): Promise<FlexCommand[]> {
        const command = await executeToggleAction(
            this.context,
            this.isUseDateRangeTypeEnabled,
            CONTROL_TYPE,
            PROPERTY_PATH
        );
        if (command.length) {
            this.isUseDateRangeTypeEnabled = !this.isUseDateRangeTypeEnabled;
        }
        return command;
    }
}
