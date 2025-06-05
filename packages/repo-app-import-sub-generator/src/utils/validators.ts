import { t } from '../utils/i18n';
import RepoAppDownloadLogger from '../utils/logger';
import { PromptState } from '../prompts/prompt-state';
import type { AppIndex } from '@sap-ux/axios-extension';
import { HELP_NODES } from '@sap-ux/guided-answers-helper';
import type { ValidationLink } from '@sap-ux/inquirer-common';
import { ERROR_TYPE, ErrorHandler } from '@sap-ux/inquirer-common';
import type { AppInfo, QuickDeployedAppConfig, QfaJsonConfig } from '../app/types';
import { downloadApp, hasQfaJson } from '../utils/download-utils';
import type { AppWizard } from '@sap-devx/yeoman-ui-types';
import { MessageType } from '@sap-devx/yeoman-ui-types';
import { qfaJsonFileName } from '../utils/constants';

/**
 * Validates the metadata section of the app configuration.
 *
 * @param {QfaJsonConfig['metadata']} metadata - The metadata object.
 * @returns {boolean} - Returns true if valid, false otherwise.
 */
const validateMetadata = (metadata: QfaJsonConfig['metadata']): boolean => {
    if (!metadata.package || typeof metadata.package !== 'string') {
        RepoAppDownloadLogger.logger?.error(t('error.invalidMetadataPackage'));
        return false;
    }
    return true;
};

/**
 * Validates the service binding details section of the app configuration.
 *
 * @param {QfaJsonConfig['serviceBindingDetails']} serviceBinding - The service binding details object.
 * @returns {boolean} - Returns true if valid, false otherwise.
 */
const validateServiceBindingDetails = (serviceBinding: QfaJsonConfig['serviceBindingDetails']): boolean => {
    if (!serviceBinding.serviceName || typeof serviceBinding.serviceName !== 'string') {
        RepoAppDownloadLogger.logger?.error(t('error.invalidServiceName'));
        return false;
    }
    if (!serviceBinding.serviceVersion || typeof serviceBinding.serviceVersion !== 'string') {
        RepoAppDownloadLogger.logger?.error(t('error.invalidServiceVersion'));
        return false;
    }
    if (!serviceBinding.mainEntityName || typeof serviceBinding.mainEntityName !== 'string') {
        RepoAppDownloadLogger.logger?.error(t('error.invalidMainEntityName'));
        return false;
    }
    return true;
};

/**
 * Validates the project attribute section of the app configuration.
 *
 * @param {QfaJsonConfig['projectAttribute']} projectAttribute - The project attribute object.
 * @returns {boolean} - Returns true if valid, false otherwise.
 */
const validateProjectAttribute = (projectAttribute: QfaJsonConfig['projectAttribute']): boolean => {
    if (!projectAttribute.moduleName || typeof projectAttribute.moduleName !== 'string') {
        RepoAppDownloadLogger.logger?.error(t('error.invalidModuleName'));
        return false;
    }
    return true;
};

/**
 * Validates the deployment details section of the app configuration.
 *
 * @param {QfaJsonConfig['deploymentDetails']} deploymentDetails - The deployment details object.
 * @returns {boolean} - Returns true if valid, false otherwise.
 */
const validateDeploymentDetails = (deploymentDetails: QfaJsonConfig['deploymentDetails']): boolean => {
    if (!deploymentDetails.repositoryName) {
        RepoAppDownloadLogger.logger?.error(t('error.invalidRepositoryName'));
        return false;
    }
    return true;
};

/**
 * Validates the entire app configuration.
 *
 * @param {QfaJsonConfig} config - The QFA JSON configuration containing app details.
 * @returns {boolean} - Returns true if the configuration is valid, false otherwise.
 */
export const validateQfaJsonFile = (config: QfaJsonConfig): boolean => {
    return (
        validateMetadata(config.metadata) &&
        validateServiceBindingDetails(config.serviceBindingDetails) &&
        validateProjectAttribute(config.projectAttribute) &&
        validateDeploymentDetails(config.deploymentDetails)
    );
};

/**
 * Validates the prompt state for the app download process.
 *
 * @param {string} targetFolder - The target folder for the app download.
 * @param {string} [appId] - The selected app id.
 * @returns {boolean} - Returns true if the prompt state is valid, false otherwise.
 */
export const isValidPromptState = (targetFolder: string, appId?: string): boolean => {
    return !!(PromptState.systemSelection.connectedSystem?.serviceProvider && appId && targetFolder);
};

/**
 * Generates a help link for the "App Not Found" error.
 *
 * @returns {Promise<ValidationLink>} - A promise resolving to a validation link for the error.
 */
async function generateAppNotFoundHelpLink(): Promise<ValidationLink> {
    return ErrorHandler.getHelpLink(
        HELP_NODES.ADT_APP_NOT_FOUND_ERROR,
        ERROR_TYPE.INTERNAL_SERVER_ERROR,
        t('error.noAppsDeployed')
    );
}

/**
 * Validates the app selection and handles app download if applicable.
 *
 * @param answers - The selected app information.
 * @param appList - The list of available apps.
 * @param quickDeployedAppConfig - The quick deployed app configuration.
 * @param appWizard - The app wizard instance.
 * @returns A promise resolving to a boolean or a validation error message.
 */
export async function validateAppSelection(
    answers: AppInfo,
    appList: AppIndex,
    quickDeployedAppConfig?: QuickDeployedAppConfig,
    appWizard?: AppWizard
): Promise<string | boolean | ValidationLink> {
    // Quick deploy config exists but no apps found
    if (quickDeployedAppConfig?.appId && appList.length === 0) {
        return await generateAppNotFoundHelpLink();
    }

    // No apps available at all
    if (appList.length === 0 && !answers?.appId) {
        return await generateAppNotFoundHelpLink();
    }

    // Valid app selected, try to download
    if (answers?.appId) {
        try {
            await downloadApp(answers.repoName);
            const isQfaJsonPresent: boolean = hasQfaJson();
            if (!isQfaJsonPresent) {
                appWizard?.showError(
                    t('error.qfaJsonNotFound', { jsonFileName: qfaJsonFileName }),
                    MessageType.notification
                );
            }
            return isQfaJsonPresent;
        } catch (error) {
            RepoAppDownloadLogger.logger?.debug(`validateAppSelection: Error downloading app: ${error.message}`);
            return t('error.appDownloadErrors.appDownloadFailure', { error: error.message });
        }
    }

    return false;
}
