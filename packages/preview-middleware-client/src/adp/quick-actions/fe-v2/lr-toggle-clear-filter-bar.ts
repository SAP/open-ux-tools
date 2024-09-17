import FlexCommand from 'sap/ui/rta/command/FlexCommand';
import CommandFactory from 'sap/ui/rta/command/CommandFactory';
import type FilterBar from 'sap/ui/comp/filterbar/FilterBar';

import { QuickActionContext, SimpleQuickActionDefinition } from '../../../cpe/quick-actions/quick-action-definition';
import { pageHasControlId } from '../../../cpe/quick-actions/utils';
import { getControlById } from '../../../utils/core';
import { SimpleQuickActionDefinitionBase } from '../simple-quick-action-base';

export const ENABLE_CLEAR_FILTER_BAR_TYPE = 'enable-clear-filter-bar';
const PROPERTY_NAME = 'showClearOnFB';
const CONTROL_TYPE = 'sap.ui.comp.smartfilterbar.SmartFilterBar';

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

    private isClearButtonEnabled = false;

    initialize(): void {
        const controls = this.context.controlIndex[CONTROL_TYPE] ?? [];
        for (const control of controls) {
            const isActionApplicable = pageHasControlId(this.context.view, control.controlId);
            const modifiedControl = getControlById<FilterBar>(control.controlId);
            if (isActionApplicable && modifiedControl) {
                this.isClearButtonEnabled = modifiedControl.getShowClearOnFB();
                this.control = modifiedControl;
            }
        }
    }

    protected get textKey() {
        return this.isClearButtonEnabled
            ? 'V2_QUICK_ACTION_LR_DISABLE_CLEAR_FILTER_BAR'
            : 'V2_QUICK_ACTION_LR_ENABLE_CLEAR_FILTER_BAR';
    }

    async execute(): Promise<FlexCommand[]> {
        if (this.control) {
            const { flexSettings } = this.context;

            const modifiedValue = {
                generator: flexSettings.generator,
                propertyName: PROPERTY_NAME,
                newValue: !this.isClearButtonEnabled
            };

            const command = await CommandFactory.getCommandFor<FlexCommand>(
                this.control,
                'Property',
                modifiedValue,
                null,
                flexSettings
            );

            this.isClearButtonEnabled = !this.isClearButtonEnabled;
            return [command];
        }

        return [];
    }
}
