import FlexCommand from 'sap/ui/rta/command/FlexCommand';
import type FilterBar from 'sap/ui/comp/filterbar/FilterBar';

import { FeatureService } from '../../../cpe/feature-service';
import { QuickActionContext, SimpleQuickActionDefinition } from '../../../cpe/quick-actions/quick-action-definition';
import { pageHasControlId } from '../../../cpe/quick-actions/utils';
import { getControlById } from '../../../utils/core';
import { SimpleQuickActionDefinitionBase } from '../simple-quick-action-base';
import { executeToggleAction } from './utils';

export const ENABLE_SEMANTIC_DATE_RANGE_FILTER_BAR = 'enable-semantic-daterange-filterbar';
const CONTROL_TYPE = 'sap.ui.comp.smartfilterbar.SmartFilterBar';

/**
 * Quick Action for toggling the visibility of "semantic date range" for filterbar fields.
 */
export class ToggleSemanticDateRangeFilterBar
    extends SimpleQuickActionDefinitionBase
    implements SimpleQuickActionDefinition
{
    constructor(context: QuickActionContext) {
        super(ENABLE_SEMANTIC_DATE_RANGE_FILTER_BAR, [], '', context);
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
            const modifiedControl = getControlById<FilterBar>(control.controlId);
            if (isActionApplicable && modifiedControl) {
                this.isUseDateRangeTypeEnabled = modifiedControl.getProperty('useDateRangeType');
                this.control = modifiedControl;
            }
        }
    }

    protected get textKey() {
        return this.isUseDateRangeTypeEnabled
            ? 'V2_QUICK_ACTION_LR_DISABLE_SEMANTIC_DATE_RANGE_FILTER_BAR'
            : 'V2_QUICK_ACTION_LR_ENABLE_SEMANTIC_DATE_RANGE_FILTER_BAR';
    }

    async execute(): Promise<FlexCommand[]> {
        const command = await executeToggleAction(
            this.context,
            'component/settings/filterSettings/dateSettings',
            this.control!,
            {
                useDateRange: !this.isUseDateRangeTypeEnabled
            }
        );
        if (command.length) {
            this.isUseDateRangeTypeEnabled = !this.isUseDateRangeTypeEnabled;
        }
        return command;
    }
}
