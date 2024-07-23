export enum ApplicationType {
    FIORI_ELEMENTS = 'FioriElements',
    FIORI_ELEMENTS_OVP = 'FioriElementsOVP',
    FREE_STYLE = 'FreeStyle',
    NONE = ''
}

export default class AppUtils {
    public static getApplicationType(oManifest: any): ApplicationType {
        if (Object.keys(oManifest).length > 0) {
            const oAppInfo = oManifest['sap.app'];
            const oSmartTemplateIdentifier = oManifest['sap.ui.generic.app'];
            if (oManifest['sap.ovp']) {
                return ApplicationType.FIORI_ELEMENTS_OVP;
            } else if (
                oAppInfo &&
                oAppInfo.sourceTemplate &&
                (oAppInfo.sourceTemplate.id.toLowerCase() === 'ui5template.smarttemplate' || oSmartTemplateIdentifier)
            ) {
                return ApplicationType.FIORI_ELEMENTS;
            } else {
                return ApplicationType.FREE_STYLE;
            }
        } else {
            return ApplicationType.NONE;
        }
    }

    public static isFioriElementsApp(sAppType: string): boolean {
        if (sAppType === ApplicationType.FIORI_ELEMENTS || sAppType === ApplicationType.FIORI_ELEMENTS_OVP) {
            return true;
        }
        return false;
    }

    public static isOVPApp(sAppType: string): boolean {
        if (sAppType === ApplicationType.FIORI_ELEMENTS_OVP) {
            return true;
        }
        return false;
    }

    public static isSupportedAppTypeForAdaptationProject(sAppType: string): boolean {
        if (this.isFioriElementsApp(sAppType) || sAppType === ApplicationType.FREE_STYLE) {
            return true;
        }
        return false;
    }

    public static isV4App(oManifest: any): boolean {
        return !!(
            oManifest['sap.ui5'] &&
            oManifest['sap.ui5']['dependencies'] &&
            oManifest['sap.ui5']['dependencies']['libs'] &&
            oManifest['sap.ui5']['dependencies']['libs']['sap.fe.templates']
        );
    }
}
