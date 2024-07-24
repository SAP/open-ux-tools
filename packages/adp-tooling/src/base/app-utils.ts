import { Manifest } from '@sap-ux/project-access';

export enum ApplicationType {
    FIORI_ELEMENTS = 'FioriElements',
    FIORI_ELEMENTS_OVP = 'FioriElementsOVP',
    FREE_STYLE = 'FreeStyle',
    NONE = ''
}

export function getApplicationType(manifest: Manifest): ApplicationType {
    if (Object.keys(manifest).length > 0) {
        const appInfo = manifest['sap.app'];
        const smartTemplateIdentifier = manifest['sap.ui.generic.app'];

        if (manifest['sap.ovp']) {
            return ApplicationType.FIORI_ELEMENTS_OVP;
        } else if (
            appInfo &&
            appInfo.sourceTemplate &&
            (appInfo.sourceTemplate.id.toLowerCase() === 'ui5template.smarttemplate' || smartTemplateIdentifier)
        ) {
            return ApplicationType.FIORI_ELEMENTS;
        } else {
            return ApplicationType.FREE_STYLE;
        }
    } else {
        return ApplicationType.NONE;
    }
}

export function isFioriElementsApp(type: string): boolean {
    if (type === ApplicationType.FIORI_ELEMENTS || type === ApplicationType.FIORI_ELEMENTS_OVP) {
        return true;
    }

    return false;
}

export function isOVPApp(type: string): boolean {
    if (type === ApplicationType.FIORI_ELEMENTS_OVP) {
        return true;
    }

    return false;
}

export function isSupportedAppTypeForAdaptationProject(type: string): boolean {
    if (isFioriElementsApp(type) || type === ApplicationType.FREE_STYLE) {
        return true;
    }

    return false;
}

export function isV4Application(manifest: Manifest): boolean {
    return !!(
        manifest['sap.ui5'] &&
        manifest['sap.ui5']['dependencies'] &&
        manifest['sap.ui5']['dependencies']['libs'] &&
        manifest['sap.ui5']['dependencies']['libs']['sap.fe.templates']
    );
}
