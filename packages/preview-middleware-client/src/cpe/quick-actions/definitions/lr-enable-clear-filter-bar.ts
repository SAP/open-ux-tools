import FlexCommand from 'sap/ui/rta/command/FlexCommand';
import CommandFactory from 'sap/ui/rta/command/CommandFactory';

import { ActivationContext, ExecutionContext, QuickActionDefinition } from './quick-action-definition';
import { getFEAppPagesMap, isPageContainsControlById } from '../../rta-service';

export const ENABLE_CLEAR_FILTER_BAR_TYPE = 'enable-clear-filter-bar';
const PROPERTY_NAME = 'showClearOnFB';

const CONTROL_TYPE = 'sap.ui.comp.smartfilterbar.SmartFilterBar';
export const ENABLE_CLEAR_FILTER_BAR: QuickActionDefinition = {
    type: ENABLE_CLEAR_FILTER_BAR_TYPE,
    title: 'Enable Clear Filter Bar Button',
    isActive: (context: ActivationContext): boolean => {
        const controls = context.controlIndex[CONTROL_TYPE];
        if (controls?.length === 1) {
            const control = controls[0];
            const pages = getFEAppPagesMap(context.rta);
            const isActionApplicable = Object.keys(pages).some(
                (key) =>
                    key.split('.').pop() === 'ListReport' &&
                    !pages[key].isInvisible &&
                    isPageContainsControlById(pages[key].page, control.controlId)
            );

            const modifiedControl = sap.ui.getCore().byId(control.controlId);
            if (!isActionApplicable || !modifiedControl) {
                return false;
            }
            return !(modifiedControl as unknown as any).getShowClearOnFB();
        }
        return false;
    },
    execute: async (context: ExecutionContext): Promise<void> => {
        const controls = context.controlIndex[CONTROL_TYPE];
        if (controls?.length === 1) {
            const control = controls[0];
            const modifiedControl = sap.ui.getCore().byId(control.controlId);
            if (!modifiedControl) {
                return;
            }

            const flexSettings = context.rta.getFlexSettings();

            const modifiedValue = {
                generator: flexSettings.generator,
                propertyName: PROPERTY_NAME,
                newValue: true
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
