import { DatasourceType } from '@sap-ux/odata-service-inquirer';
import { PromptNames, type RepoAppDownloadAnswers } from '../app/types.js';
import { AppDownloadType } from '../app/types.js';
import { t } from './i18n.js';

export interface DownloadTypeConfig {
    generatorSuccessMsg: string;
    readMeAppDescription: string;
    /** OData filter params used to narrow the app list to apps relevant for this flow. */
    searchParams: Record<string, string>;
}

// The source template ID used for filtering the apps in the repository
export const adtSourceTemplateId = '@sap.adt.sevicebinding.deploy:lrop';

/**
 * Title and description config per download flow, used in the constructor
 */
export const generatorTitleConfig: Record<AppDownloadType, { title: string; description: string }> = {
    [AppDownloadType.ADTQuickDeploy]: {
        title: 'Download ADT deployed app from SAPUI5 ABAP repository',
        description: 'Download an application that was generated with the ADT Quick SAP Fiori Application generator'
    },
    [AppDownloadType.AbapRepository]: {
        title: 'Download app from UI5 ABAP repository',
        description: 'Download app from SAPUI5 ABAP repository'
    }
};

/**
 * Per-flow configuration looked up at runtime via `downloadTypeConfig[this.downloadType]`.
 * Getters are used so i18n strings are resolved after the i18n instance is initialised.
 */
export const downloadTypeConfig: Record<AppDownloadType, DownloadTypeConfig> = {
    [AppDownloadType.ADTQuickDeploy]: {
        get generatorSuccessMsg() {
            return t('info.adtQuickDeploy.repoAppDownloadCompleteMsg');
        },
        get readMeAppDescription() {
            return t('readMe.adtQuickDeploy.appDescription');
        },
        searchParams: { 'sap.app/sourceTemplate/id': adtSourceTemplateId }
    },
    [AppDownloadType.AbapRepository]: {
        get generatorSuccessMsg() {
            return t('info.abapRepository.repoAppDownloadCompleteMsg');
        },
        get readMeAppDescription() {
            return t('readMe.abapRepository.appDescription');
        },
        searchParams: { 'sap.app/type': 'application' }
    }
};

// Name of the generator used for Fiori app download
export const generatorName = '@sap-ux/repo-app-import-sub-generator';
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
