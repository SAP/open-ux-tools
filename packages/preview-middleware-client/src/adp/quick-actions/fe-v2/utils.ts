import UI5Element from 'sap/ui/core/Element';
import FlexCommand from 'sap/ui/rta/command/FlexCommand';
import CommandFactory from 'sap/ui/rta/command/CommandFactory';

import { QuickActionContext } from '../../../cpe/quick-actions/quick-action-definition';
import { getUi5Version, isLowerThanMinimalUi5Version, isVersionEqualOrHasNewerPatch } from '../../../utils/version';
import { Manifest } from 'sap/ui/rta/RuntimeAuthoring';
import Component from 'sap/ui/core/Component';
import type AppComponent from 'sap/suite/ui/generic/template/lib/AppComponent';
import type ManagedObject from 'sap/ui/base/ManagedObject';
import type TemplateComponent from 'sap/suite/ui/generic/template/lib/TemplateComponent';

/**
 * Gets app component of a v2 project.
 *
 * @param control - ManagedObject.
 * @returns AppComponent.
 */
export function getV2AppComponent(control: ManagedObject): AppComponent | undefined {
    const ownerComponent = Component.getOwnerComponentFor(control);
    let result;
    if (ownerComponent?.isA<TemplateComponent>('sap.suite.ui.generic.template.lib.TemplateComponent')) {
        result = ownerComponent.getAppComponent();
    }
    return result;
}

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
    propertyValue: object | string
): Promise<FlexCommand[]> {
    const { flexSettings } = context;
    const appComponent = getV2AppComponent(control);
    const modifiedValue = {
        changeType: 'appdescr_ui_generic_app_changePageConfiguration',
        reference: flexSettings.projectId,
        appComponent,
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
 * Checks whether the manifest has array structured page definitions
 * @param manifest - manifest object
 * @returns true if pages are defined as array, false if defined as object
 */
export function isManifestArrayStructured(manifest: Manifest): boolean {
    return Array.isArray(manifest['sap.ui.generic.app']?.pages);
}

/**
 * Checks if the current UI5 version and manifest structure is supported in v2 applications.
 *
 * @param manifest - manifest changes of the current application.
 *
 * Returns `false`
 *
 *  - If the manifest is structured is an array and is below version 1.134
 *  - If the UI5 version is not supported
 * Otherwise, returns `true`.
 *
 */
export async function areManifestChangesSupported(manifest: Manifest): Promise<boolean> {
    const version = await getUi5Version();
    if (isLowerThanMinimalUi5Version(version, { major: 1, minor: 134 }) && isManifestArrayStructured(manifest)) {
        return false;
    }

    const isAboveOrEqualMinimalVersion = !isLowerThanMinimalUi5Version(version, { major: 1, minor: 128 });
    const isSupportedPatchVersion =
        isVersionEqualOrHasNewerPatch(version, { major: 1, minor: 96, patch: 35 }) ||
        isVersionEqualOrHasNewerPatch(version, { major: 1, minor: 108, patch: 38 }) ||
        isVersionEqualOrHasNewerPatch(version, { major: 1, minor: 120, patch: 23 });

    return isAboveOrEqualMinimalVersion || isSupportedPatchVersion;
}

