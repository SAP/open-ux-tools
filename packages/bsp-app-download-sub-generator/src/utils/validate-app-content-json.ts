import { t } from '../utils/i18n';
import type { AppContentConfig } from '../app/types';
import BspAppDownloadLogger from '../utils/logger';

/**
 * Validates the metadata section of the app configuration.
 *
 * @param {AppContentConfig['metadata']} metadata - The metadata object.
 * @returns {boolean} - Returns true if valid, false otherwise.
 */
const validateMetadata = (metadata: AppContentConfig['metadata']): boolean => {
    if (!metadata.package || typeof metadata.package !== 'string') {
        BspAppDownloadLogger.logger?.error(t('error.invalidMetadataPackage'));
        return false;
    }
    return true;
};

/**
 * Validates the service binding details section of the app configuration.
 *
 * @param {AppContentConfig['serviceBindingDetails']} serviceBinding - The service binding details object.
 * @returns {boolean} - Returns true if valid, false otherwise.
 */
const validateServiceBindingDetails = (serviceBinding: AppContentConfig['serviceBindingDetails']): boolean => {
    if (!serviceBinding.serviceName || typeof serviceBinding.serviceName !== 'string') {
        BspAppDownloadLogger.logger?.error(t('error.invalidServiceName'));
        return false;
    }
    if (!serviceBinding.serviceVersion || typeof serviceBinding.serviceVersion !== 'string') {
        BspAppDownloadLogger.logger?.error(t('error.invalidServiceVersion'));
        return false;
    }
    if (!serviceBinding.mainEntityName || typeof serviceBinding.mainEntityName !== 'string') {
        BspAppDownloadLogger.logger?.error(t('error.invalidMainEntityName'));
        return false;
    }
    return true;
};

/**
 * Validates the project attribute section of the app configuration.
 *
 * @param {AppContentConfig['projectAttribute']} projectAttribute - The project attribute object.
 * @returns {boolean} - Returns true if valid, false otherwise.
 */
const validateProjectAttribute = (projectAttribute: AppContentConfig['projectAttribute']): boolean => {
    if (!projectAttribute.moduleName || typeof projectAttribute.moduleName !== 'string') {
        BspAppDownloadLogger.logger?.error(t('error.invalidModuleName'));
        return false;
    }
    return true;
};

/**
 * Validates the deployment details section of the app configuration.
 *
 * @param {AppContentConfig['deploymentDetails']} deploymentDetails - The deployment details object.
 * @returns {boolean} - Returns true if valid, false otherwise.
 */
const validateDeploymentDetails = (deploymentDetails: AppContentConfig['deploymentDetails']): boolean => {
    if (!deploymentDetails.repositoryName) {
        BspAppDownloadLogger.logger?.error(t('error.invalidRepositoryName'));
        return false;
    }
    return true;
};

/**
 * Validates the entire app configuration.
 *
 * @param {AppContentConfig} config - The app configuration object.
 * @returns {boolean} - Returns true if the configuration is valid, false otherwise.
 */
export const validateAppContentJsonFile = (config: AppContentConfig): boolean => {
    return (
        validateMetadata(config.metadata) &&
        validateServiceBindingDetails(config.serviceBindingDetails) &&
        validateProjectAttribute(config.projectAttribute) &&
        validateDeploymentDetails(config.deploymentDetails)
    );
};
