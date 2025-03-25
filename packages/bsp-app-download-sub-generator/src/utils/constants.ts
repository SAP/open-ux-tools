export const generatorTitle = 'Fiori App Download from BSP';
export const generatorDescription = 'Download a Fiori LROP app from a BSP reapository';
export const extractedFilePath = 'extractedFiles';

export const generatorName = '@sap-ux/bsp-app-download-sub-generator';
export const adtSourceTemplateId = '@sap.adt.sevicebinding.deploy:lrop';

// filter using source template id
export const appListSearchParams = {
    'sap.app/sourceTemplate/id': adtSourceTemplateId
};
export const appListResultFields = [
    'sap.app/id',
    'sap.app/title',
    'sap.app/description',
    'sap.app/sourceTemplate/id',
    'repoName',
    'fileType',
    'url'
];
