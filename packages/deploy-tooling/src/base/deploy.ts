import type { AbapServiceProvider, Ui5AbapRepositoryService, AxiosError } from '@sap-ux/axios-extension';
import { isAxiosError, TransportRequestService } from '@sap-ux/axios-extension';
import type { Logger } from '@sap-ux/logger';
import { writeFileSync } from 'fs';
import type { AbapDeployConfig } from '../types';
import { getConfigForLogging, isBspConfig, throwConfigMissingError } from './config';
import { promptConfirmation } from './prompt';
import { createAbapServiceProvider, getCredentialsWithPrompts } from '@sap-ux/system-access';
import { getAppDescriptorVariant } from './archive';
import { validateBeforeDeploy, formatSummary } from './validate';

/**
 * Internal deployment commands
 */
type TryCommand = (
    provider: AbapServiceProvider,
    config: AbapDeployConfig,
    logger: Logger,
    archive: Buffer
) => Promise<void>;

/**
 * Handle exceptions thrown, in some cases we to retry them.
 *
 * @param command - the request type deploy | undeploy
 * @param error - thrown error object
 * @param provider - instance of the axios-extension abap service provider
 * @param config - configuration used for the previous request
 * @param logger - reference to the logger instance
 * @param archive - archive file that is to be deployed
 */
async function handleError(
    command: TryCommand,
    error: Error,
    provider: AbapServiceProvider,
    config: AbapDeployConfig,
    logger: Logger,
    archive: Buffer
): Promise<void> {
    const retry = config.retry === undefined ? true : config.retry;
    if (retry && isAxiosError(error)) {
        const success = await axiosErrorRetryHandler(command, error.response, provider, config, logger, archive);
        if (success) {
            return;
        }
    }
    logger.error(`${command === tryDeploy ? 'Deployment' : 'Undeployment'} has failed.`);
    logger.debug(getConfigForLogging(config as AbapDeployConfig));
    if (!config.verbose) {
        logger.error(
            'Change logging level to debug your issue\n\t(see examples https://github.com/SAP/open-ux-tools/tree/main/packages/deploy-tooling#configuration-with-logging-enabled)'
        );
    }
    throw error;
}

/**
 * Handler for 412 error code.
 *
 * @param command - the request type deploy | undeploy
 * @param provider - instance of the axios-extension abap service provider
 * @param config - configuration used for the previous request
 * @param logger - reference to the logger instance
 * @param archive - archive file that is to be deployed
 * @returns true if the error was handled otherwise false is returned
 */
async function handle412Error(
    command: TryCommand,
    provider: AbapServiceProvider,
    config: AbapDeployConfig,
    logger: Logger,
    archive: Buffer
) {
    logger.warn('An app in the same repository with different sap app id found.');
    if (config.yes || (await promptConfirmation('Do you want to overwrite (Y/n)?'))) {
        await command(provider, { ...config, safe: false, retry: false }, logger, archive);
        return true;
    } else {
        return false;
    }
}

/**
 * Handler for 401 error code.
 *
 * @param command - the request type deploy | undeploy
 * @param provider - instance of the axios-extension abap service provider
 * @param config - configuration used for the previous request
 * @param logger - reference to the logger instance
 * @param archive - archive file that is to be deployed
 * @returns true if the error was handled otherwise false is returned
 */
async function handle401Error(
    command: TryCommand,
    provider: AbapServiceProvider,
    config: AbapDeployConfig,
    logger: Logger,
    archive: Buffer
) {
    logger.warn(`${command === tryDeploy ? 'Deployment' : 'Undeployment'} failed with authentication error.`);
    logger.info(
        'Please maintain correct credentials to avoid seeing this error\n\t(see help: https://www.npmjs.com/package/@sap/ux-ui5-tooling#setting-environment-variables-in-a-env-file)'
    );
    logger.info('Please enter your credentials.');
    const credentials = await getCredentialsWithPrompts(provider.defaults?.auth?.username);
    if (Object.keys(credentials).length) {
        if (config.target.serviceKey) {
            config.target.serviceKey.uaa.username = credentials.username;
            config.target.serviceKey.uaa.password = credentials.password;
        } else {
            config.credentials = credentials;
        }
        await command(provider, config, logger, archive);
        return true;
    } else {
        return false;
    }
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
 * @returns true if the error was handled otherwise false is return or an error is raised
 */
async function axiosErrorRetryHandler(
    command: TryCommand,
    response: AxiosError['response'],
    provider: AbapServiceProvider,
    config: AbapDeployConfig,
    logger: Logger,
    archive: Buffer
): Promise<boolean> {
    switch (response?.status) {
        case 401:
            return handle401Error(command, provider, config, logger, archive);
        case 412:
            return handle412Error(command, provider, config, logger, archive);
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
 * Creates a new transport request using adt service.
 *
 * @param config - deployment configuration
 * @param logger - reference to the logger instance
 * @param provider - optional instance of the axios-extension abap service provider
 * @throws error if transport request creation fails
 * @returns transportRequest
 */
export async function createTransportRequest(
    config: AbapDeployConfig,
    logger: Logger,
    provider?: AbapServiceProvider
): Promise<string> {
    if (!provider) {
        provider = await createProvider(config, logger);
    }
    const adtService = await provider.getAdtService<TransportRequestService>(TransportRequestService);
    const ui5AppName = isBspConfig(config.app) ? config.app.name : '';
    const transportRequest = await adtService?.createTransportRequest({
        packageName: config.app.package ?? '',
        ui5AppName,
        description: 'Created by @sap-ux/deploy-tooling'
    });
    if (transportRequest) {
        logger.info(`Transport request ${transportRequest} created for application ${ui5AppName}.`);
        return transportRequest;
    }
    throw new Error(`Transport request could not be created for application ${ui5AppName}.`);
}

/**
 * Create a service provider based on the given config.
 *
 * @param config - deployment configuration
 * @param logger - reference to the logger instance
 * @returns an instance of an ABAP service provider
 */
async function createProvider(config: AbapDeployConfig, logger: Logger): Promise<AbapServiceProvider> {
    return await createAbapServiceProvider(
        config.target,
        {
            auth: config.credentials,
            ignoreCertErrors: !config.strictSsl
        },
        !!config.target.scp,
        logger
    );
}

/**
 * Check if the archive is an adapation project and if yes, try to deploy it to the layered repository.
 *
 * @param provider - instance of the axios-extension abap service provider
 * @param config - deployment configuration
 * @param logger - reference to the logger instance
 * @param archive - archive file that is to be deployed
 */
async function tryDeployToLrep(
    provider: AbapServiceProvider,
    config: AbapDeployConfig,
    logger: Logger,
    archive: Buffer
) {
    logger.debug('No BSP name provided, check if it is an adaptation project');
    const descriptor = getAppDescriptorVariant(archive);
    if (descriptor) {
        if (config.test) {
            throw new Error('Deployment in TestMode not supported for deployments to the layered repository.');
        } else {
            logger.debug('Deploying an adaptation project to LREP');
            const service = provider.getLayeredRepository();
            await service.deploy(archive, {
                namespace: descriptor.namespace,
                layer: descriptor.layer,
                package: config.app.package,
                transport: config.app.transport
            });
        }
    } else {
        throwConfigMissingError('app-name');
    }
}

/**
 * Try executing the deployment command and handle known errors.
 *
 * @param provider - instance of the axios-extension abap service provider
 * @param config - deployment configuration
 * @param logger - reference to the logger instance
 * @param archive - archive file that is to be deployed
 */
async function tryDeploy(
    provider: AbapServiceProvider,
    config: AbapDeployConfig,
    logger: Logger,
    archive: Buffer
): Promise<void> {
    try {
        if (config.createTransport) {
            config.app.transport = await createTransportRequest(config, logger, provider);
            // Reset as we don't want other flows kicking it off again!
            config.createTransport = false;
        }
        // check if deployment of BSP is requested
        if (isBspConfig(config.app) && !config.lrep) {
            if (config.test === true) {
                const validateOutput = await validateBeforeDeploy(config, provider, logger);
                logger.info(formatSummary(validateOutput.summary));
            }
            const service = getUi5AbapRepositoryService(provider, config, logger);
            await service.deploy({ archive, bsp: config.app, testMode: config.test, safeMode: config.safe });
        } else {
            await tryDeployToLrep(provider, config, logger, archive);
        }
        if (config.test === true) {
            logger.info(
                'Deployment in TestMode completed. A successful TestMode execution does not necessarily mean that your upload will be successful.'
            );
        } else {
            logger.info('Deployment Successful.');
        }
    } catch (error) {
        await handleError(tryDeploy, error, provider, config, logger, archive);
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
        writeFileSync(`archive.zip`, archive);
    }
    const provider = await createProvider(config, logger);
    logger.info(`Starting to deploy${config.test === true ? ' in test mode' : ''}.`);
    await tryDeploy(provider, config, logger, archive);
}

/**
 * Try executing the undeployment command and handle known errors.
 *
 * @param provider - instance of the axios-extension abap service provider
 * @param config - deployment configuration
 * @param logger - reference to the logger instance
 */
async function tryUndeploy(provider: AbapServiceProvider, config: AbapDeployConfig, logger: Logger): Promise<void> {
    if (isBspConfig(config.app)) {
        try {
            if (config.createTransport) {
                config.app.transport = await createTransportRequest(config, logger, provider);
                config.createTransport = false;
            }
            if (config.lrep) {
                const service = provider.getLayeredRepository();
                await service.undeploy({
                    namespace: config.app.name,
                    transport: config.app.transport
                });
            } else {
                const service = getUi5AbapRepositoryService(provider, config, logger);
                await service.undeploy({ bsp: config.app, testMode: config.test });
            }
            if (config.test === true) {
                logger.info(
                    'Undeployment in TestMode completed. A successful TestMode execution does not necessarily mean that your undeploy will be successful.'
                );
            } else {
                logger.info('Undeployment Successful.');
            }
        } catch (error) {
            await handleError(tryUndeploy, error, provider, config, logger, Buffer.from(''));
        }
    } else {
        throwConfigMissingError('app-name');
    }
}

/**
 * Undeploy the given project from the given target using the given app name.
 *
 * @param config - deployment configuration
 * @param logger - reference to the logger instance
 */
export async function undeploy(config: AbapDeployConfig, logger: Logger): Promise<void> {
    const provider = await createProvider(config, logger);
    logger.info(`Starting to undeploy ${config.test === true ? ' in test mode' : ''}.`);
    await tryUndeploy(provider, config, logger);
}
