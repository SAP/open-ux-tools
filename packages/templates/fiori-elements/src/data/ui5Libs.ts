import { FrameworkVersion, TemplateType } from './types';

export const getUI5Libs = (templateType: TemplateType, version: FrameworkVersion): Array<string> => {
    switch(version) {
        case FrameworkVersion.V2:
            return getV2Libs(templateType);
        case FrameworkVersion.V4:
            return getV4Libs(templateType);
        default:
            throw new Error('Unsupported version: ' + version);
    }
};


const getV2Libs = (templateType: TemplateType): Array<string> => {
    const commonLibs = ['sap.f', 'sap.ui.comp', 'sap.ui.table', 'sap.ushell'];

    if (templateType == TemplateType.ListReport) {
        return [...commonLibs, 'sap.suite.ui.generic.template', 'sap.ui.generic.app'];
    } else if (templateType === TemplateType.OverviewPage) {
        return [...commonLibs, 'sap.ovp'];
    } else {
        return commonLibs;
    }
};

const getV4Libs = (_templateType: TemplateType): Array<string> => {
    return ['sap.fe.templates', 'sap.ushell'];
}