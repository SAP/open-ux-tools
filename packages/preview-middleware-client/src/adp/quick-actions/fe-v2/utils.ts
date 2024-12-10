import UI5Element from 'sap/ui/core/Element';
import FlexCommand from 'sap/ui/rta/command/FlexCommand';
import CommandFactory from 'sap/ui/rta/command/CommandFactory';

import { QuickActionContext } from '../../../cpe/quick-actions/quick-action-definition';
import { getUi5Version, isLowerThanMinimalUi5Version, isVersionEqualOrHasNewerPatch } from '../../../utils/version';
import { Manifest } from 'sap/ui/rta/RuntimeAuthoring';

/**
 * Prepares the change for the manifest setting.
 *
 * @param context - The context object containing flexSettings.
 * @param propertyPath - The path of the property in the manifest.
 * @param control - The UI5 element representing the control.
 * @param component - component name e.g list report or object page.
 * @param entitySet - Entity Set name.
 * @param propertyValue - The value to be set for the property.
 *
 * @returns  A Promise resolving to an array of FlexCommand objects.
 */
export async function prepareManifestChange(
    context: QuickActionContext,
    propertyPath: string,
    control: UI5Element,
    component: string,
    entitySet: string | undefined,
    propertyValue: object
): Promise<FlexCommand[]> {
    const { flexSettings } = context;

    const modifiedValue = {
        changeType: 'appdescr_ui_generic_app_changePageConfiguration',
        reference: flexSettings.projectId,
        parameters: {
            parentPage: {
                component,
                entitySet
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
 * Checks if the current UI5 version and manifest structure is supported in v2 applications.
 *
 * @param manifest - manifest changes of the current application.
 *
 * Returns `false`
 *
 *  - If the manifest is structured is an array
 *  - If the UI5 version is not supported
 * Otherwise, returns `true`.
 *
 */
export async function areManifestChangesSupported(manifest: Manifest): Promise<boolean> {
    const pagesStructureInManifest = manifest['sap.ui.generic.app'].pages;
    if (Array.isArray(pagesStructureInManifest)) {
        return false;
    }

    const version = await getUi5Version();
    const isAboveOrEqualMinimalVersion = !isLowerThanMinimalUi5Version(version, { major: 1, minor: 128 });
    const isSupportedPatchVersion =
        isVersionEqualOrHasNewerPatch(version, { major: 1, minor: 96, patch: 37 }) ||
        isVersionEqualOrHasNewerPatch(version, { major: 1, minor: 108, patch: 38 }) ||
        isVersionEqualOrHasNewerPatch(version, { major: 1, minor: 120, patch: 23 });

    return isAboveOrEqualMinimalVersion || isSupportedPatchVersion;
}
