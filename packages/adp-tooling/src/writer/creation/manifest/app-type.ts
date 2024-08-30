import type { Manifest } from '@sap-ux/project-access';

import { ApplicationType } from '../../../types';

/**
 * Determines the type of UI5 application based on the content of its manifest file.
 * This function checks various properties within the manifest to classify the application
 * into predefined types such as Fiori Elements, Fiori Elements OVP, Free Style, or None.
 *
 * @param {Manifest} manifest - The manifest configuration object of the application.
 * @returns {ApplicationType} The type of the application as defined by the ApplicationType enum.
 *
 * The classification is done based on the presence and values of specific keys in the manifest:
 * - 'sap.ovp' indicates a Fiori Elements Overview Page (OVP).
 * - 'sap.ui.generic.app' or 'sap.app' with a specific sourceTemplate id indicates a Fiori Elements application.
 * - If none of these conditions are met, the function defaults to categorizing the application as Free Style.
 * - If the manifest is empty, it returns None.
 */
export function getApplicationType(manifest: Manifest): ApplicationType {
    if (Object.keys(manifest).length > 0) {
        const appInfo = manifest['sap.app'];
        const isSmartTemplate = !!manifest['sap.ui.generic.app'];
        const hasSmartTemplateId = appInfo?.sourceTemplate?.id?.toLowerCase() === 'ui5template.smarttemplate';

        if (manifest['sap.ovp']) {
            return ApplicationType.FIORI_ELEMENTS_OVP;
        } else if (hasSmartTemplateId || isSmartTemplate) {
            return ApplicationType.FIORI_ELEMENTS;
        } else {
            return ApplicationType.FREE_STYLE;
        }
    } else {
        return ApplicationType.NONE;
    }
}
