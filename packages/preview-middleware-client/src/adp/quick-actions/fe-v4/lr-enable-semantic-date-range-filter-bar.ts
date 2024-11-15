import FlexCommand from 'sap/ui/rta/command/FlexCommand';
import FilterBar from 'sap/ui/mdc/FilterBar';

import { FeatureService } from '../../../cpe/feature-service';
import { QuickActionContext, SimpleQuickActionDefinition } from '../../../cpe/quick-actions/quick-action-definition';
import { pageHasControlId } from '../../../cpe/quick-actions/utils';
import { getControlById } from '../../../utils/core';
import { executeToggleAction } from './utils';
import { SimpleQuickActionDefinitionBase } from '../simple-quick-action-base';

export const ENABLE_SEMANTIC_DATE_RANGE = 'enable-semantic-date-range';
const PROPERTY_PATH = 'controlConfiguration/@com.sap.vocabularies.UI.v1.SelectionFields/useSemanticDateRange';
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

    initialize(): void {
        if (FeatureService.isFeatureEnabled('cpe.beta.quick-actions') === false) {
            return;
        }
        const controls = this.context.controlIndex[CONTROL_TYPE] ?? [];
        for (const control of controls) {
            const isActionApplicable = pageHasControlId(this.context.view, control.controlId);
            const filterBar = getControlById<FilterBar>(control.controlId);
            if (isActionApplicable && filterBar) {
                this.control = filterBar;
                this.isUseDateRangeTypeEnabled = boolMap[this.control.data('useSemanticDateRange')];
            }
        }
    }

    protected get textKey() {
        return this.isUseDateRangeTypeEnabled
            ? 'V4_QUICK_ACTION_LR_DISABLE_SEMANTIC_DATE_RANGE_FILTER_BAR'
            : 'V4_QUICK_ACTION_LR_ENABLE_SEMANTIC_DATE_RANGE_FILTER_BAR';
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
