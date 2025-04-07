import { PromptNames, type BspAppDownloadAnswers } from '../app/types';

// Title and description for the generator
export const generatorTitle = 'Basic App Download from BSP';
export const generatorDescription = 'Download a basic LROP app from a BSP reapository';

// Name of the generator used for Fiori app download
export const generatorName = '@sap-ux/bsp-app-download-sub-generator';
// The source template ID used for filtering the apps in the BSP repository
export const adtSourceTemplateId = '@sap.adt.sevicebinding.deploy:lrop';

// Default initial answers to use as a fallback.
export const defaultAnswers: BspAppDownloadAnswers = {
    [PromptNames.systemSelection]: {
        system: {
            name: '',
            url: ''
        },
        type: 'backendSystem'
    },
    [PromptNames.selectedApp]: {
        appId: '',
        title: '',
        description: '',
        repoName: '',
        url: ''
    },
    [PromptNames.targetFolder]: ''
};

// Path for storing the extracted files from BSP
export const extractedFilePath = 'extractedFiles';

// Search parameters to filter applications by the source template ID
export const appListSearchParams = {
    'sap.app/sourceTemplate/id': adtSourceTemplateId
};
// Fields to retrieve from the app list, useful for displaying app metadata
export const appListResultFields = [
    'sap.app/id', // ID of the application
    'sap.app/title', // Title of the application
    'sap.app/description', // Description of the application
    'sap.app/sourceTemplate/id', // ID of the source template
    'repoName', // Repository name where the app is located
    'fileType', // Type of file (.zip etc)
    'url' // URL for accessing the app
];
