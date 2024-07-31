import FlexCommand from 'sap/ui/rta/command/FlexCommand';
import CommandFactory from 'sap/ui/rta/command/CommandFactory';

import {
    QuickActionContext,
    SimpleQuickActionDefinition,
} from '../quick-action-definition';
import { isPageContainsControlById } from '../../../rta-service';
import { getCurrentActivePage } from './utils';
import { SIMPLE_QUICK_ACTION_KIND, SimpleQuickAction } from '@sap-ux-private/control-property-editor-common';

export const ENABLE_CLEAR_FILTER_BAR_TYPE = 'enable-clear-filter-bar';
const PROPERTY_NAME = 'showClearOnFB';

const CONTROL_TYPE = 'sap.ui.comp.smartfilterbar.SmartFilterBar';
export class ToggleClearFilterBarQuickAction implements SimpleQuickActionDefinition {
    readonly kind = SIMPLE_QUICK_ACTION_KIND;
    readonly type = ENABLE_CLEAR_FILTER_BAR_TYPE;
    isActive = false;
    isClearButtonEnabled = false;
    constructor(private context: QuickActionContext) {}

    initialize() {
        const controls = this.context.controlIndex[CONTROL_TYPE];
        if (controls?.length === 1) {
            const activePages = getCurrentActivePage(this.context);
            for (const activePage of activePages) {
                const control = controls[0];
                const isActionApplicable = isPageContainsControlById(activePage.page, control.controlId);
                const modifiedControl = sap.ui.getCore().byId(control.controlId);
                if (isActionApplicable && modifiedControl) {
                    this.isActive = true;
                    this.isClearButtonEnabled = (modifiedControl as unknown as any).getShowClearOnFB() as boolean;
                }
            }
        }
    }

    getActionObject(): SimpleQuickAction {
        return {
            kind: SIMPLE_QUICK_ACTION_KIND,
            type: this.type,
            enabled: this.isActive,
            // TODO: translate this?
            title: `${this.isClearButtonEnabled ? 'Disable' : 'Enable'} Clear Filter Bar Button`
        };
    }

    async execute(): Promise<FlexCommand[]> {
        const controls = this.context.controlIndex[CONTROL_TYPE];
        const control = controls[0];
        if (control) {
            const modifiedControl = sap.ui.getCore().byId(control.controlId);
            if (!modifiedControl) {
                return [];
            }

            const flexSettings = this.context.rta.getFlexSettings();

            const modifiedValue = {
                generator: flexSettings.generator,
                propertyName: PROPERTY_NAME,
                newValue: !this.isClearButtonEnabled
            };

            const command = await CommandFactory.getCommandFor<FlexCommand>(
                modifiedControl,
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
