import { DatasourceType } from '@sap-ux/odata-service-inquirer';
import { PromptNames, AppDownloadType, type RepoAppDownloadAnswers } from '../app/types';
import { t } from './i18n';

export interface DownloadTypeConfig {
    generatorTitle: string;
    generatorDescription: string;
    generatorSuccessMsg: string;
    /** OData filter params used to narrow the app list to apps relevant for this flow. */
    searchParams: Record<string, string>;
}

// The source template ID used for filtering the apps in the repository
export const adtSourceTemplateId = '@sap.adt.sevicebinding.deploy:lrop';

/**
 * Per-flow configuration looked up at runtime via `downloadTypeConfig[this.downloadType]`.
 * Getters are used so i18n strings are resolved after the i18n instance is initialised.
 */
export const downloadTypeConfig: Record<AppDownloadType, DownloadTypeConfig> = {
    [AppDownloadType.ADTQuickDeploy]: {
        get generatorTitle() {
            return t('generatorConfig.adtQuickDeploy.title');
        },
        get generatorDescription() {
            return t('generatorConfig.adtQuickDeploy.description');
        },
        get generatorSuccessMsg() {
            return t('info.adtQuickDeploy.repoAppDownloadCompleteMsg');
        },
        searchParams: { 'sap.app/sourceTemplate/id': adtSourceTemplateId }
    },
    [AppDownloadType.AbapRepository]: {
        get generatorTitle() {
            return t('generatorConfig.abapRepository.title');
        },
        get generatorDescription() {
            return t('generatorConfig.abapRepository.description');
        },
        get generatorSuccessMsg() {
            return t('info.abapRepository.repoAppDownloadCompleteMsg');
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
