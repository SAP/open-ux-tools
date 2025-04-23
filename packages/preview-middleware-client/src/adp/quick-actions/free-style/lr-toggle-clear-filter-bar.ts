import FlexCommand from 'sap/ui/rta/command/FlexCommand';
import FilterBar from 'sap/ui/mdc/FilterBar';

import { QuickActionContext, SimpleQuickActionDefinition } from '../../../cpe/quick-actions/quick-action-definition';
import { pageHasControlId } from '../../../cpe/quick-actions/utils';
import { getControlById } from '../../../utils/core';
import { executeToggleAction } from './utils';
import { SimpleQuickActionDefinitionBase } from '../simple-quick-action-base';

export const ENABLE_CLEAR_FILTER_BAR_TYPE = 'enable-clear-filter-bar';
const PROPERTY_NAME = 'showClearButton';
const PROPERTY_PATH = `controlConfiguration/@com.sap.vocabularies.UI.v1.SelectionFields/${PROPERTY_NAME}`;
const CONTROL_TYPE = 'sap.fe.macros.controls.FilterBar';

/**
 * Quick Action for toggling the visibility of "clear filter bar" button in List Report page.
 */
export class ToggleClearFilterBarQuickAction
    extends SimpleQuickActionDefinitionBase
    implements SimpleQuickActionDefinition
{
    constructor(context: QuickActionContext) {
        super(ENABLE_CLEAR_FILTER_BAR_TYPE, [], '', context);
    }
    readonly forceRefreshAfterExecution = true;
    private isClearButtonEnabled = false;

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
                this.isClearButtonEnabled = value === undefined ? filterBar.getShowClearButton() : (value as boolean);
            }
        }
        return Promise.resolve();
    }

    protected get textKey() {
        return this.isClearButtonEnabled
            ? 'V4_QUICK_ACTION_LR_DISABLE_CLEAR_FILTER_BAR'
            : 'V4_QUICK_ACTION_LR_ENABLE_CLEAR_FILTER_BAR';
    }

    async execute(): Promise<FlexCommand[]> {
        const command = await executeToggleAction(this.context, this.isClearButtonEnabled, CONTROL_TYPE, PROPERTY_PATH);
        if (command.length) {
            this.isClearButtonEnabled = !this.isClearButtonEnabled;
        }
        return command;
    }
}
