import { t } from '../utils/i18n';
import type { QfaJsonConfig } from '../app/types';
import BspAppDownloadLogger from '../utils/logger';
import { PromptState } from '../prompts/prompt-state';

/**
 * Validates the metadata section of the app configuration.
 *
 * @param {QfaJsonConfig['metadata']} metadata - The metadata object.
 * @returns {boolean} - Returns true if valid, false otherwise.
 */
const validateMetadata = (metadata: QfaJsonConfig['metadata']): boolean => {
    if (!metadata.package || typeof metadata.package !== 'string') {
        BspAppDownloadLogger.logger?.error(t('error.invalidMetadataPackage'));
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
const validateServiceBindingDetails = (serviceBinding: QfaJsonConfig['service_binding_details']): boolean => {
    if (!serviceBinding.service_name || typeof serviceBinding.service_name !== 'string') {
        BspAppDownloadLogger.logger?.error(t('error.invalidServiceName'));
        return false;
    }
    if (!serviceBinding.service_version || typeof serviceBinding.service_version !== 'string') {
        BspAppDownloadLogger.logger?.error(t('error.invalidServiceVersion'));
        return false;
    }
    if (!serviceBinding.main_entity_name || typeof serviceBinding.main_entity_name !== 'string') {
        BspAppDownloadLogger.logger?.error(t('error.invalidMainEntityName'));
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
const validateProjectAttribute = (projectAttribute: QfaJsonConfig['project_attribute']): boolean => {
    if (!projectAttribute.module_name || typeof projectAttribute.module_name !== 'string') {
        BspAppDownloadLogger.logger?.error(t('error.invalidModuleName'));
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
const validateDeploymentDetails = (deploymentDetails: QfaJsonConfig['deployment_details']): boolean => {
    if (!deploymentDetails.repository_name) {
        BspAppDownloadLogger.logger?.error(t('error.invalidRepositoryName'));
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
        validateServiceBindingDetails(config.service_binding_details) &&
        validateProjectAttribute(config.project_attribute) &&
        validateDeploymentDetails(config.deployment_details)
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
