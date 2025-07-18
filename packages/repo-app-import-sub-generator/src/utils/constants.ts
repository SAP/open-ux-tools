import { DatasourceType } from '@sap-ux/odata-service-inquirer';
import { PromptNames, type RepoAppDownloadAnswers } from '../app/types';

// Title and description for the generator
export const generatorTitle = 'Download ADT deployed app from UI5 ABAP repository';
export const generatorDescription =
    'Download an application that was generated with the ADT Quick Fiori Application generator';

// Name of the generator used for Fiori app download
export const generatorName = '@sap-ux/repo-app-import-sub-generator';
// The source template ID used for filtering the apps in the repository
export const adtSourceTemplateId = '@sap.adt.sevicebinding.deploy:lrop';
// The source template ID used for Fiori app generation
export const fioriAppSourcetemplateId = '@sap/generator-fiori:lrop';
// The name of the QFA JSON file provided with the downloaded app, containing all user inputs.
export const qfaJsonFileName = 'qfa.json';

// Default initial answers to use as a fallback.
export const defaultAnswers: RepoAppDownloadAnswers = {
    [PromptNames.systemSelection]: { datasourceType: DatasourceType.sapSystem },
    [PromptNames.selectedApp]: {
        appId: '',
        title: '',
        description: '',
        repoName: '',
        url: ''
    },
    [PromptNames.targetFolder]: ''
};

// Path for storing the extracted files from repository
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
