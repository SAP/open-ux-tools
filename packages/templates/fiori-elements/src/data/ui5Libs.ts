import { TemplateType } from './types';

export const getUI5Libs = (templateType: TemplateType): Array<string> => {
    const commonLibs = ['sap.f', 'sap.ui.comp', 'sap.ui.table', 'sap.ushell'];

    if (templateType == TemplateType.ListReport) {
        return [...commonLibs, 'sap.suite.ui.generic.template', 'sap.ui.generic.app'];
    } else if (templateType === TemplateType.OverviewPage) {
        return [...commonLibs, 'sap.ovp'];
    } else {
        return commonLibs;
    }
};
