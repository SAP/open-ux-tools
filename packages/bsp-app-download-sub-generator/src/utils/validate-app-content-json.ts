import type { Logger } from '@sap-ux/logger';
import { t } from '../utils/i18n';
import type { AppContentConfig } from '../app/types';

/**
 * Validates the metadata section of the app configuration.
 *
 * @param {AppContentConfig['metadata']} metadata - The metadata object.
 * @param {Logger} log - The logger instance.
 * @returns {boolean} - Returns true if valid, false otherwise.
 */
const validateMetadata = (metadata: AppContentConfig['metadata'], log?: Logger): boolean => {
    if (!metadata.package || typeof metadata.package !== 'string') {
        log?.error(t('error.invalidMetadataPackage'));
        return false;
    }
    return true;
};

/**
 * Validates the service binding details section of the app configuration.
 *
 * @param {AppContentConfig['serviceBindingDetails']} serviceBinding - The service binding details object.
 * @param {Logger} log - The logger instance.
 * @returns {boolean} - Returns true if valid, false otherwise.
 */
const validateServiceBindingDetails = (
    serviceBinding: AppContentConfig['serviceBindingDetails'],
    log?: Logger
): boolean => {
    if (!serviceBinding.serviceName || typeof serviceBinding.serviceName !== 'string') {
        log?.error(t('error.invalidServiceName'));
        return false;
    }
    if (!serviceBinding.serviceVersion || typeof serviceBinding.serviceVersion !== 'string') {
        log?.error(t('error.invalidServiceVersion'));
        return false;
    }
    if (!serviceBinding.mainEntityName || typeof serviceBinding.mainEntityName !== 'string') {
        log?.error(t('error.invalidMainEntityName'));
        return false;
    }
    return true;
};

/**
 * Validates the project attribute section of the app configuration.
 *
 * @param {AppContentConfig['projectAttribute']} projectAttribute - The project attribute object.
 * @param {Logger} log - The logger instance.
 * @returns {boolean} - Returns true if valid, false otherwise.
 */
const validateProjectAttribute = (projectAttribute: AppContentConfig['projectAttribute'], log?: Logger): boolean => {
    if (!projectAttribute.moduleName || typeof projectAttribute.moduleName !== 'string') {
        log?.error(t('error.invalidModuleName'));
        return false;
    }
    return true;
};

/**
 * Validates the deployment details section of the app configuration.
 *
 * @param {AppContentConfig['deploymentDetails']} deploymentDetails - The deployment details object.
 * @param {Logger} log - The logger instance.
 * @returns {boolean} - Returns true if valid, false otherwise.
 */
const validateDeploymentDetails = (deploymentDetails: AppContentConfig['deploymentDetails'], log?: Logger): boolean => {
    if (!deploymentDetails.repositoryName) {
        log?.error(t('error.invalidRepositoryName'));
        return false;
    }
    return true;
};

/**
 * Validates the entire app configuration.
 *
 * @param {AppContentConfig} config - The app configuration object.
 * @param {Logger} log - The logger instance.
 * @returns {boolean} - Returns true if the configuration is valid, false otherwise.
 */
export const validateAppContentJsonFile = (config: AppContentConfig, log?: Logger): boolean => {
    return (
        validateMetadata(config.metadata, log) &&
        validateServiceBindingDetails(config.serviceBindingDetails, log) &&
        validateProjectAttribute(config.projectAttribute, log) &&
        validateDeploymentDetails(config.deploymentDetails, log)
    );
};
