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
    isAxiosError,
    TransportRequestService
} from '@sap-ux/axios-extension';
import type { ServiceInfo } from '@sap-ux/btp-utils';
import { isAppStudio, listDestinations } from '@sap-ux/btp-utils';
import type { Logger } from '@sap-ux/logger';
import type { BackendSystem } from '@sap-ux/store';
import { getService, BackendSystemKey } from '@sap-ux/store';
import { writeFileSync, existsSync } from 'fs';
import type { AbapDeployConfig, UrlAbapTarget } from '../types';
import { getConfigForLogging, isUrlTarget } from './config';
import { promptConfirmation, promptCredentials, promptServiceKeys } from './prompt';
import { create as createStorage } from 'mem-fs';
import { UI5Config } from '@sap-ux/ui5-config';
import type { AbapTarget } from '@sap-ux/ui5-config';
import { create } from 'mem-fs-editor';
import { join } from 'path';

type BasicAuth = Required<Pick<BackendSystem, 'username' | 'password'>>;
type ServiceAuth = Required<Pick<BackendSystem, 'serviceKeys' | 'name'>> & { refreshToken?: string };

const deploymentCommands = { tryUndeploy, tryDeploy };

/**
 * Internal deployment commands
 */
const enum TryCommands {
    Deploy = 'tryDeploy',
    UnDeploy = 'tryUndeploy'
}

/**
 * Check the secure storage if it has credentials for the given target.
 *
 * @param target - ABAP target
 * @returns {*}  {(Promise<T | undefined>)} - Credentials
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
 * @returns {*}  {(Promise<AbapServiceProvider>)} - ABAP Service Provider
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
 * Checks if credentials are of basic auth type.
 *
 * @param authOpts credential options
 * @returns boolean
 */
function isBasicAuth(authOpts: BasicAuth | ServiceAuth | undefined): authOpts is BasicAuth {
    return !!authOpts && (authOpts as BasicAuth).password !== undefined;
}

/**
 * Enhance axios options and create a service provider instance for an on-premise ABAP system.
 *
 * @param options - predefined axios options
 * @param target - url target configuration
 * @returns {*}  {(Promise<AbapServiceProvider>)}
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
        const storedOpts = await getCredentials<BasicAuth | ServiceAuth>(target);
        if (isBasicAuth(storedOpts)) {
            options.auth = {
                username: storedOpts.username,
                password: storedOpts.password
            };
        }
        if ((storedOpts as ServiceAuth)?.serviceKeys) {
            throw new Error(
                'This is an ABAP Cloud system, please add the --cloud arg to ensure the correct deployment flow.'
            );
        }
    }
    return createForAbap(options);
}

/**
 * Create an instance of an AbapServiceProvider connected to the given target configuration.
 *
 * @param config - deployment configuration
 * @param logger - optional reference to the logger instance
 * @returns service instance
 */
async function getAbapServiceProvider(config: AbapDeployConfig, logger?: Logger): Promise<AbapServiceProvider> {
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
            provider = await createAbapCloudServiceProvider(options, config.target, config.retry, logger);
        } else {
            provider = await createAbapServiceProvider(options, config.target);
        }
    } else {
        throw new Error('Unable to handle the configuration in the current environment.');
    }
    return provider;
}

/**
 * Handle exceptions thrown, in some cases we to retry them.
 *
 * @param command - the request type deploy | undeploy
 * @param error - thrown error object
 * @param provider - instance of the axios-extension abap service provider
 * @param config - configuration used for the previous request
 * @param logger - reference to the logger instance
 * @param archive - archive file that is to be deployed
 * @param configPath - path to config file
 */
async function handleError(
    command: TryCommands,
    error: Error,
    provider: AbapServiceProvider,
    config: AbapDeployConfig,
    logger: Logger,
    archive: Buffer,
    configPath?: string
): Promise<void> {
    const retry = config.retry === undefined ? true : config.retry;
    if (retry && isAxiosError(error)) {
        const success = await handleAxiosError(command, error.response, provider, config, logger, archive, configPath);
        if (success) {
            return;
        }
    }
    logger.error(`${command === TryCommands.Deploy ? 'Deployment' : 'Undeployment'} has failed.`);
    logger.debug(getConfigForLogging(config));
    if (!config.verbose) {
        logger.error(
            'Change logging level to debug your issue\n\t(see examples https://github.com/SAP/open-ux-tools/tree/main/packages/deploy-tooling#configuration-with-logging-enabled)'
        );
    }
    throw error;
}

/**
 * Main function for different deploy retry handling.
 *
 * @param command - the request type deploy | undeploy
 * @param response - response of that triggered and axios error
 * @param provider - instance of the axios-extension abap service provider
 * @param config - configuration used for the previous request
 * @param logger - reference to the logger instance
 * @param archive - archive file that is to be deployed
 * @param configPath - path to config file
 * @returns true if the error was handled otherwise false is return or an error is raised
 */
async function handleAxiosError(
    command: TryCommands,
    response: AxiosError['response'],
    provider: AbapServiceProvider,
    config: AbapDeployConfig,
    logger: Logger,
    archive: Buffer,
    configPath?: string
): Promise<boolean> {
    switch (response?.status) {
        case 401:
            logger.warn(
                `${command === TryCommands.Deploy ? 'Deployment' : 'Undeployment'} failed with authentication error.`
            );
            logger.info(
                'Please maintain correct credentials to avoid seeing this error\n\t(see help: https://www.npmjs.com/package/@sap/ux-ui5-tooling#setting-environment-variables-in-a-env-file)'
            );
            logger.info('Please enter your credentials.');
            const service = getUi5AbapRepositoryService(provider, config, logger);
            const credentials = await promptCredentials(service.defaults.auth?.username);
            if (Object.keys(credentials).length) {
                service.defaults.auth = credentials;
                await deploymentCommands[command](provider, config, logger, archive, configPath);
                return true;
            } else {
                return false;
            }
        case 412:
            logger.warn('An app in the same repository with different sap app id found.');
            if (config.yes || (await promptConfirmation('Do you want to overwrite (Y/n)?'))) {
                await deploymentCommands[command](
                    provider,
                    { ...config, safe: false, retry: false },
                    logger,
                    archive,
                    configPath
                );
                return true;
            } else {
                return false;
            }
        default:
            return false;
    }
}

/**
 * Generate a Ui5AbapRepositoryService instance from the supplied deployment config.
 *
 * @param provider - instance of the axios-extension abap service provider
 * @param config - deployment configuration
 * @param logger - reference to the logger instance
 * @returns service returns the UI5 ABAP Repository service
 */
function getUi5AbapRepositoryService(
    provider: AbapServiceProvider,
    config: AbapDeployConfig,
    logger: Logger
): Ui5AbapRepositoryService {
    const service = provider.getUi5AbapRepository(config.target?.service);
    service.log = logger;
    if (!config.strictSsl) {
        logger.warn(
            'You chose not to validate SSL certificate. Please verify the server certificate is trustful before proceeding. See documentation for recommended configuration (https://help.sap.com/viewer/17d50220bcd848aa854c9c182d65b699/Latest/en-US/4b318bede7eb4021a8be385c46c74045.html).'
        );
    }
    return service;
}

/**
 * Updates the config (ui5-deploy.yaml) file with the new transport request.
 *
 * @param config - deployment configuration
 * @param logger - reference to the logger instance
 * @param configPath - path to the config file
 * @returns
 */
async function updateYaml(config: AbapDeployConfig, logger: Logger, configPath?: string): Promise<void> {
    const deployYamlPath = configPath ?? join(process.cwd(), 'ui5-deploy.yaml');
    if (existsSync(deployYamlPath)) {
        try {
            const fs = create(createStorage());
            const ui5DeployConfig = await UI5Config.newInstance(fs.read(deployYamlPath));
            const abapTarget = {
                ...config.target,
                scp: config.target.cloud
            } as AbapTarget;
            ui5DeployConfig.updateAbapDeployTask(abapTarget, config.app);
            fs.write(deployYamlPath, ui5DeployConfig.toString());
            return new Promise((resolve) => {
                fs.commit(resolve);
                logger.info('Updated the ui5-deploy.yaml');
            });
        } catch {
            logger.error(
                `Failed to update the ui5-deploy.yaml, please manually update with new transport: ${config.app.transport}`
            );
        }
    } else {
        logger.error('No ui5-deploy.yaml found');
    }
}

/**
 * Creates a new transport request using adt service.
 *
 * @param provider - instance of the axios-extension abap service provider
 * @param config - deployment configuration
 * @param logger - reference to the logger instance
 * @param configPath - path to config file
 */
async function createTransportRequest(
    provider: AbapServiceProvider,
    config: AbapDeployConfig,
    logger: Logger,
    configPath?: string
): Promise<void> {
    const adtService = await provider.getAdtService<TransportRequestService>(TransportRequestService);
    if (adtService) {
        const createTransportParams = {
            packageName: config.app.package ?? '',
            ui5AppName: config.app.name,
            description: 'Created by @sap-ux/deploy-tooling'
        };

        try {
            const transportRequest = await adtService.createTransportRequest(createTransportParams);
            if (transportRequest) {
                config.app.transport = transportRequest;
                logger.info(`Transport request ${transportRequest} created for deployment.`);
                await updateYaml(config, logger, configPath);
            }
        } catch (e) {
            logger.error(
                'Transport request could not be created. Please create it manually and re-run deployment configuration for this project'
            );
        }
    }
}

/**
 * Generic method to run the deployment request i.e. deploy | undeploy.
 *
 * @param command - the request type deploy | undeploy to be executed
 * @param config - deployment configuration
 * @param logger - reference to the logger instance
 * @param archive - archive file that is to be deployed
 * @param configPath - path to config file
 */
async function runCommand(
    command: TryCommands,
    config: AbapDeployConfig,
    logger: Logger,
    archive: Buffer = Buffer.from(''),
    configPath?: string
): Promise<void> {
    const provider = await getAbapServiceProvider(config, logger);
    logger.info(
        `Starting to ${command === TryCommands.Deploy ? 'deploy' : 'undeploy'}${
            config.test === true ? ' in test mode' : ''
        }.`
    );
    await deploymentCommands[command](provider, config, logger, archive, configPath);
}

/**
 * Try executing the deployment command and handle known errors.
 *
 * @param provider - instance of the axios-extension abap service provider
 * @param config - deployment configuration
 * @param logger - reference to the logger instance
 * @param archive - archive file that is to be deployed
 * @param configPath - path to config file
 */
async function tryDeploy(
    provider: AbapServiceProvider,
    config: AbapDeployConfig,
    logger: Logger,
    archive: Buffer,
    configPath?: string
): Promise<void> {
    const service = getUi5AbapRepositoryService(provider, config, logger);
    if (config.createTransport) {
        await createTransportRequest(provider, config, logger, configPath);
    }
    try {
        await service.deploy({ archive, bsp: config.app, testMode: config.test, safeMode: config.safe });
        if (config.test === true) {
            logger.info(
                'Deployment in TestMode completed. A successful TestMode execution does not necessarily mean that your upload will be successful.'
            );
        } else {
            logger.info('Deployment Successful.');
        }
    } catch (error) {
        await handleError(TryCommands.Deploy, error, provider, config, logger, archive, configPath);
    }
}

/**
 * Deploy the given archive to the given target using the given app description.
 *
 * @param archive - archive file that is to be deployed
 * @param config - deployment configuration
 * @param logger - reference to the logger instance
 * @param configPath - path to config file
 */
export async function deploy(
    archive: Buffer,
    config: AbapDeployConfig,
    logger: Logger,
    configPath?: string
): Promise<void> {
    if (config.keep) {
        writeFileSync(`archive.zip`, archive);
    }
    await runCommand(TryCommands.Deploy, config, logger, archive, configPath);
}

/**
 * Try executing the undeployment command and handle known errors.
 *
 * @param provider - instance of the axios-extension abap service provider
 * @param config - deployment configuration
 * @param logger - reference to the logger instance
 */
async function tryUndeploy(provider: AbapServiceProvider, config: AbapDeployConfig, logger: Logger): Promise<void> {
    try {
        const service = getUi5AbapRepositoryService(provider, config, logger);
        await service.undeploy({ bsp: config.app, testMode: config.test });
        if (config.test === true) {
            logger.info(
                'Undeployment in TestMode completed. A successful TestMode execution does not necessarily mean that your undeploy will be successful.'
            );
        } else {
            logger.info('Undeployment Successful.');
        }
    } catch (error) {
        await handleError(TryCommands.UnDeploy, error, provider, config, logger, Buffer.from(''));
    }
}

/**
 * Undeploy the given project from the given target using the given app name.
 *
 * @param config - deployment configuration
 * @param logger - reference to the logger instance
 */
export async function undeploy(config: AbapDeployConfig, logger: Logger): Promise<void> {
    await runCommand(TryCommands.UnDeploy, config, logger);
}
