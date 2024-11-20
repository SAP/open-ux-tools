import UI5Element from 'sap/ui/core/Element';
import FlexCommand from 'sap/ui/rta/command/FlexCommand';
import CommandFactory from 'sap/ui/rta/command/CommandFactory';

import { QuickActionContext } from '../../../cpe/quick-actions/quick-action-definition';
import SmartFilterBar from 'sap/ui/comp/smartfilterbar/SmartFilterBar';
import { getUi5Version, isLowerThanMinimalUi5Version, isVersionEqualOrHasNewerPatch } from '../../../utils/version';

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
/**
 * Check the specific version for following quick actions
 *  -- semantic date range for filter bar
 *  -- enable table filtering
 * **/
export async function checkSupportedVersionForTableAction(): Promise<boolean> {
    const version = await getUi5Version();
    return isLowerThanMinimalUi5Version(version, { major: 1, minor: 128 }) &&
        !(
            isVersionEqualOrHasNewerPatch(version, { major: 1, minor: 96, patch: 37 }) ||
            isVersionEqualOrHasNewerPatch(version, { major: 1, minor: 108, patch: 38 }) ||
            isVersionEqualOrHasNewerPatch(version, { major: 1, minor: 120, patch: 23 })
        );
}