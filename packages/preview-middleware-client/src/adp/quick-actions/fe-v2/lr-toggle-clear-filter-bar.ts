import FlexCommand from 'sap/ui/rta/command/FlexCommand';
import CommandFactory from 'sap/ui/rta/command/CommandFactory';
import type FilterBar from 'sap/ui/comp/filterbar/FilterBar';

import { SIMPLE_QUICK_ACTION_KIND, SimpleQuickAction } from '@sap-ux-private/control-property-editor-common';

import { QuickActionContext, SimpleQuickActionDefinition } from '../../../cpe/quick-actions/quick-action-definition';

import { pageHasControlId } from '../../../cpe/quick-actions/utils';
import { getControlById } from '../../../utils/core';

export const ENABLE_CLEAR_FILTER_BAR_TYPE = 'enable-clear-filter-bar';
const PROPERTY_NAME = 'showClearOnFB';

const CONTROL_TYPE = 'sap.ui.comp.smartfilterbar.SmartFilterBar';

/**
 * Quick Action for toggling the visibility of "clear filter bar" button in List Report page.
 */
export class ToggleClearFilterBarQuickAction implements SimpleQuickActionDefinition {
    readonly kind = SIMPLE_QUICK_ACTION_KIND;
    readonly type = ENABLE_CLEAR_FILTER_BAR_TYPE;

    public get id(): string {
        return `${this.context.key}-${this.type}`;
    }

    public get isActive(): boolean {
        return !!this.filterBar;
    }

    private isClearButtonEnabled = false;
    private filterBar: FilterBar | undefined;
    constructor(private context: QuickActionContext) {}

    initialize(): void {
        const controls = this.context.controlIndex[CONTROL_TYPE] ?? [];
        for (const control of controls) {
            const isActionApplicable = pageHasControlId(this.context.view, control.controlId);
            const modifiedControl = getControlById<FilterBar>(control.controlId);
            if (isActionApplicable && modifiedControl) {
                this.isClearButtonEnabled = modifiedControl.getShowClearOnFB();
                this.filterBar = modifiedControl;
            }
        }
    }

    getActionObject(): SimpleQuickAction {
        const key = this.isClearButtonEnabled
            ? 'V2_QUICK_ACTION_LR_DISABLE_CLEAR_FILTER_BAR'
            : 'V2_QUICK_ACTION_LR_ENABLE_CLEAR_FILTER_BAR';
        return {
            kind: SIMPLE_QUICK_ACTION_KIND,
            id: this.id,
            enabled: this.isActive,
            title: this.context.resourceBundle.getText(key)
        };
    }

    async execute(): Promise<FlexCommand[]> {
        if (this.filterBar) {
            const { flexSettings } = this.context;

            const modifiedValue = {
                generator: flexSettings.generator,
                propertyName: PROPERTY_NAME,
                newValue: !this.isClearButtonEnabled
            };

            const command = await CommandFactory.getCommandFor<FlexCommand>(
                this.filterBar,
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
