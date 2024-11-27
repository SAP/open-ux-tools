import UI5Element from 'sap/ui/core/Element';
import FlexCommand from 'sap/ui/rta/command/FlexCommand';
import CommandFactory from 'sap/ui/rta/command/CommandFactory';

import { QuickActionContext } from '../../../cpe/quick-actions/quick-action-definition';
import SmartFilterBar from 'sap/ui/comp/smartfilterbar/SmartFilterBar';
import { getUi5Version, isLowerThanMinimalUi5Version, isVersionEqualOrHasNewerPatch } from '../../../utils/version';
import { isA } from '../../../utils/core';
import SmartTable from 'sap/ui/comp/smarttable/SmartTable';
import { SMART_TABLE_TYPE } from '../table-quick-action-base';


/**
* Prepares the change for the manifest setting.
* 
* @param context - The context object containing flexSettings.
* @param propertyPath - The path of the property in the manifest.
* @param control - The UI5 element representing the control.
* @param propertyValue - The value to be set for the property.
* 
* @returns  A Promise resolving to an array of FlexCommand objects.
*/
export async function prepareManifestChange(
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
                entitySet: isA<SmartFilterBar>('sap.ui.comp.smartfilterbar', control) || isA<SmartTable>(SMART_TABLE_TYPE, control) ? control.getEntitySet() : undefined
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
 * Checks if the current UI5 version supports specific quick actions in v2.
 * 
 * This check ensures that the UI5 version is valid for the following quick actions:
 * - Semantic date range support in the Filter Bar.
 * - Disable/Enable Semantic Date Range in Filter Bar 
 * 
 * Returns `true` if the UI5 version is supported.
 * Otherwise, returns `false`.
 * 
 */
export async function isUnsupportedUI5Version(): Promise<boolean> {
    const version = await getUi5Version();
    return isLowerThanMinimalUi5Version(version, { major: 1, minor: 128 }) &&
        !(
            isVersionEqualOrHasNewerPatch(version, { major: 1, minor: 96, patch: 37 }) ||
            isVersionEqualOrHasNewerPatch(version, { major: 1, minor: 108, patch: 38 }) ||
            isVersionEqualOrHasNewerPatch(version, { major: 1, minor: 120, patch: 23 })
        );
}