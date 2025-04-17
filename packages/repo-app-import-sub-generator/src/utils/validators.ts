import { t } from '../utils/i18n';
import type { QfaJsonConfig } from '../app/types';
import RepoAppDownloadLogger from '../utils/logger';
import { PromptState } from '../prompts/prompt-state';

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
