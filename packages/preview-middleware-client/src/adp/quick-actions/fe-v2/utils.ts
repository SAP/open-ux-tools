import UI5Element from 'sap/ui/core/Element';
import FlexCommand from 'sap/ui/rta/command/FlexCommand';
import CommandFactory from 'sap/ui/rta/command/CommandFactory';

import { QuickActionContext } from '../../../cpe/quick-actions/quick-action-definition';
import SmartFilterBar from 'sap/ui/comp/smartfilterbar/SmartFilterBar';

export async function executeToggleAction(
    context: QuickActionContext,
    propertyPath: string,
    control: UI5Element,
    propertyValue: object
): Promise<FlexCommand[]> {
    const { flexSettings } = context;

    const modifiedValue = {
        changeType: 'appdescr_ui_generic_app_changePageConfiguration',
        reference: flexSettings.projectId,
        parameters: {
            parentPage: {
                component: 'sap.suite.ui.generic.template.ListReport',
                entitySet: (control as SmartFilterBar).getEntitySet()
            },
            entityPropertyChange: {
                propertyPath: propertyPath,
                operation: 'UPSERT',
                propertyValue: propertyValue
            }
        }
    };
    const command = await CommandFactory.getCommandFor<FlexCommand>(
        control,
        'appDescriptor',
        modifiedValue,
        null,
        flexSettings
    );
    return [command];
}
