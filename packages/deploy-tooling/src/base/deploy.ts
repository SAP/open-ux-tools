import type {
    AbapServiceProvider,
    ProviderConfiguration,
    Ui5AbapRepositoryService,
    AxiosRequestConfig,
    AxiosError,
    AbapCloudStandaloneOptions
} from '@sap-ux/axios-extension';
import {
    AbapCloudEnvironment,
    createForAbap,
    createForDestination,
    createForAbapOnCloud,
    isAxiosError
} from '@sap-ux/axios-extension';
import type { ServiceInfo } from '@sap-ux/btp-utils';
import { isAppStudio, listDestinations } from '@sap-ux/btp-utils';
import type { Logger } from '@sap-ux/logger';
import type { BackendSystem } from '@sap-ux/store';
import { getService, BackendSystemKey } from '@sap-ux/store';
import { writeFileSync } from 'fs';
import type { AbapDeployConfig, UrlAbapTarget } from '../types';
import { getConfigForLogging, isUrlTarget } from './config';
import { promptConfirmation, promptCredentials, promptServiceKeys } from './prompt';

type BasicAuth = Required<Pick<BackendSystem, 'username' | 'password'>>;
type ServiceAuth = Required<Pick<BackendSystem, 'serviceKeys' | 'name'>> & { refreshToken?: string };

/**
 * Check the secure storage if it has credentials for the given target.
 *
 * @param target - ABAP target
 */
export async function getCredentials<T extends BasicAuth | ServiceAuth | undefined>(
    target: UrlAbapTarget
): Promise<T | undefined> {
    if (!isAppStudio()) {
        const systemService = await getService<BackendSystem, BackendSystemKey>({ entityName: 'system' });
        let system = await systemService.read(new BackendSystemKey({ url: target.url, client: target.client }));
        if (!system && target.client) {
            // check if there are credentials for the default client
            system = await systemService.read(new BackendSystemKey({ url: target.url }));
        }
        return system as T;
    } else {
        return undefined;
    }
}

/**
 * Enhance axios options and create a service provider instance for an ABAP Cloud system.
 *
 * @param options - predefined axios options
 * @param target - url target configuration
 * @param noPrompt - only if not truthy prompt for anything
 * @param logger - reference to the logger instance
 */
async function createAbapCloudServiceProvider(
    options: AxiosRequestConfig,
    target: UrlAbapTarget,
    noPrompt?: boolean,
    logger?: Logger
): Promise<AbapServiceProvider> {
    const providerConfig: Partial<AbapCloudStandaloneOptions & ProviderConfiguration> = {
        ...options,
        environment: AbapCloudEnvironment.Standalone,
        service: target.serviceKey
    };
    if (!target.serviceKey) {
        const storedOpts = await getCredentials<ServiceAuth>(target);
        if (logger && storedOpts) {
            providerConfig.service = storedOpts.serviceKeys as ServiceInfo;
            providerConfig.refreshToken = storedOpts.refreshToken;
            logger.info(`Using system [${storedOpts.name}] from System store`);
        }
        if (!storedOpts && !noPrompt) {
            providerConfig.service = await promptServiceKeys();
        }
    }
    if (providerConfig.service) {
        return createForAbapOnCloud(providerConfig as AbapCloudStandaloneOptions);
    } else {
        throw new Error('Service keys required for deployment to an ABAP Cloud environment.');
    }
}

/**
 * Enhance axios options and create a service provider instance for an on-premise ABAP system.
 *
 * @param options - predefined axios options
 * @param target - url target configuration
 */
async function createAbapServiceProvider(
    options: AxiosRequestConfig,
    target: UrlAbapTarget
): Promise<AbapServiceProvider> {
    options.baseURL = target.url;
    if (target.client) {
        options.params['sap-client'] = target.client;
    }
    if (!options.auth) {
        const storedOpts = await getCredentials<BasicAuth>(target);
        if (storedOpts?.password) {
            options.auth = {
                username: storedOpts.username,
                password: storedOpts.password
            };
        }
    }
    return createForAbap(options);
}

/**
 * Create an instance of a UI5AbapRepository service connected to the given target configuration.
 *
 * @param config - deployment configuration
 * @param logger - optional reference to the logger instance
 * @returns service instance
 */
async function createDeployService(config: AbapDeployConfig, logger?: Logger): Promise<Ui5AbapRepositoryService> {
    let provider: AbapServiceProvider;
    const options: AxiosRequestConfig & Partial<ProviderConfiguration> = {};
    if (config.strictSsl === false) {
        options.ignoreCertErrors = true;
    }
    if (config.credentials?.password) {
        options.auth = {
            username: config.credentials?.username,
            password: config.credentials?.password
        };
    }
    options.params = config.target.params || {};
    // Destination only supported on Business Application studio
    if (isAppStudio() && config.target.destination) {
        // Need additional properties to determine the type of destination we are dealing with
        const destinations = await listDestinations();
        const destination = destinations?.[config.target.destination];
        if (!destination) {
            throw new Error(`Destination ${config.target.destination} not found on subaccount`);
        }
        provider = createForDestination(options, destination) as AbapServiceProvider;
    } else if (isUrlTarget(config.target)) {
        if (config.target.cloud) {
            provider = await createAbapCloudServiceProvider(options, config.target, config.noRetry, logger);
        } else {
            provider = await createAbapServiceProvider(options, config.target);
        }
    } else {
        throw new Error('Unable to handle the configuration in the current environment.');
    }
    return provider.getUi5AbapRepository();
}

/**
 * Try executing the deployment command and handle known errors.
 *
 * @param archive - archive file that is to be deployed
 * @param service - instance of the axios-extension deployment service
 * @param config - deployment configuration
 * @param logger - reference to the logger instance
 */
async function tryDeploy(archive: Buffer, service: Ui5AbapRepositoryService, config: AbapDeployConfig, logger: Logger) {
    try {
        await service.deploy({ archive, bsp: config.app, testMode: config.test, safeMode: config.safe });
    } catch (e) {
        if (!config.noRetry && isAxiosError(e)) {
            const success = await handleAxiosError(e.response, archive, service, config, logger);
            if (success) {
                return;
            }
        }
        logger.error('Deployment has failed.');
        logger.debug(getConfigForLogging(config));
        if (!config.verbose) {
            logger.error(
                'Change logging level to debug your issue\n\t(see examples https://github.com/SAP/open-ux-tools/tree/main/packages/deploy-tooling#configuration-with-logging-enabled)'
            );
        }

        throw e;
    }
}

/**
 * Main function for different deploy retry handling.
 *
 * @param response - response of that triggered and axios error
 * @param archive - archive file that is to be deployed
 * @param service - instance of the axios-extension deployment service
 * @param config - configuration used for the previous request
 * @param logger - reference to the logger instance
 * @returns true if the error was handled otherwise false is return or an error is raised
 */
async function handleAxiosError(
    response: AxiosError['response'],
    archive: Buffer,
    service: Ui5AbapRepositoryService,
    config: AbapDeployConfig,
    logger: Logger
): Promise<boolean> {
    switch (response?.status) {
        case 401:
            logger.warn('Deployment failed with authentication error.');
            logger.info(
                'Please maintain correct credentials to avoid seeing this error\n\t(see help: https://www.npmjs.com/package/@sap/ux-ui5-tooling#setting-environment-variables-in-a-env-file)'
            );
            logger.info('Please enter your credentials for this deployment.');
            const credentials = await promptCredentials(service.defaults.auth?.username);
            if (Object.keys(credentials).length) {
                service.defaults.auth = credentials;
                await tryDeploy(archive, service, config, logger);
                return true;
            } else {
                return false;
            }
        case 412:
            logger.warn('An app in the same repository with different sap app id found.');
            if (config.yes || (await promptConfirmation('Do you want to overwrite (Y/n)?'))) {
                await tryDeploy(archive, service, { ...config, safe: false, noRetry: true }, logger);
                return true;
            } else {
                return false;
            }
        default:
            return false;
    }
}

/**
 * Deploy the given archive to the given target using the given app description.
 *
 * @param archive - archive file that is to be deployed
 * @param config - deployment configuration
 * @param logger - reference to the logger instance
 */
export async function deploy(archive: Buffer, config: AbapDeployConfig, logger: Logger): Promise<void> {
    if (config.keep) {
        writeFileSync(`archive-${Date.now()}.zip`, archive);
    }
    const service = await createDeployService(config, logger);
    service.log = logger;
    if (!config.strictSsl) {
        logger.warn(
            'You chose not to validate SSL certificate. Please verify the server certificate is trustful before proceeding. See documentation for recommended configuration (https://help.sap.com/viewer/17d50220bcd848aa854c9c182d65b699/Latest/en-US/4b318bede7eb4021a8be385c46c74045.html).'
        );
    }
    logger.info(`Starting to deploy${config.test === true ? ' in test mode' : ''}.`);
    await tryDeploy(archive, service, config, logger);
    if (config.test === true) {
        logger.info(
            'Deployment in TestMode completed. A successful TestMode execution does not necessarily mean that your upload will be successful.'
        );
    } else {
        logger.info('Successfully deployed.');
    }
}

/**
 * Deploy the given archive to the given target using the given app description.
 *
 * @param config - deployment configuration
 * @param logger - reference to the logger instance
 */
export async function undeploy(config: AbapDeployConfig, logger: Logger): Promise<void> {
    const service = await createDeployService(config, logger);
    service.log = logger;
    if (!config.strictSsl) {
        logger.warn(
            'You chose not to validate SSL certificate. Please verify the server certificate is trustful before proceeding. See documentation for recommended configuration (https://help.sap.com/viewer/17d50220bcd848aa854c9c182d65b699/Latest/en-US/4b318bede7eb4021a8be385c46c74045.html).'
        );
    }
    logger.info(`Starting to undeploy${config.test === true ? ' in test mode' : ''}.`);
    if (await service.undeploy({ bsp: config.app, testMode: config.test })) {
        logger.info('Successfully undeployed.');
    }
}
