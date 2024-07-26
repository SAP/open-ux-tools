import FlexCommand from 'sap/ui/rta/command/FlexCommand';
import CommandFactory from 'sap/ui/rta/command/CommandFactory';

import {
    ActivationContext,
    ExecutionContext,
    QuickActionActivationData,
    QuickActionDefinition
} from './quick-action-definition';
import { isPageContainsControlById } from '../../rta-service';
import { getCurrentActivePage } from './utils';

export const ENABLE_CLEAR_FILTER_BAR_TYPE = 'enable-clear-filter-bar';
const PROPERTY_NAME = 'showClearOnFB';

const CONTROL_TYPE = 'sap.ui.comp.smartfilterbar.SmartFilterBar';
export const ENABLE_CLEAR_FILTER_BAR: QuickActionDefinition<boolean> = {
    type: ENABLE_CLEAR_FILTER_BAR_TYPE,
    getActivationData: (context: ActivationContext): QuickActionActivationData<boolean> => {
        let result: QuickActionActivationData<boolean> = {
            isActive: false,
            title: '',
            executionPayload: false
        };
        const controls = context.controlIndex[CONTROL_TYPE];
        if (controls?.length === 1) {
            const activePages = getCurrentActivePage(context);
            for (const activePage of activePages) {
                const control = controls[0];
                const isActionApplicable = isPageContainsControlById(activePage.page, control.controlId);
                const modifiedControl = sap.ui.getCore().byId(control.controlId);
                if (isActionApplicable && modifiedControl) {
                    const isClearButtonEnabled = (modifiedControl as unknown as any).getShowClearOnFB() as boolean;
                    result = {
                        isActive: true,
                        title: `${isClearButtonEnabled ? 'Disable' : 'Enable'} Clear Filter Bar Button`,
                        executionPayload: !isClearButtonEnabled
                    };
                    break;
                }
            }
        }
        return result;
    },
    execute: async (context: ExecutionContext, index, payload): Promise<void> => {
        const controls = context.controlIndex[CONTROL_TYPE];
        const control = controls[0];
        if (control) {
            const modifiedControl = sap.ui.getCore().byId(control.controlId);
            if (!modifiedControl) {
                return;
            }

            const flexSettings = context.rta.getFlexSettings();

            const modifiedValue = {
                generator: flexSettings.generator,
                propertyName: PROPERTY_NAME,
                newValue: !!payload
            };

            const command = await CommandFactory.getCommandFor<FlexCommand>(
                modifiedControl,
                'Property',
                modifiedValue,
                null,
                flexSettings
            );

            await context.rta.getCommandStack().pushAndExecute(command);
        }
    }
};
