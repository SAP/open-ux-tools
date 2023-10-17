import type { AbapServiceProvider, Ui5AbapRepositoryService, AxiosError } from '@sap-ux/axios-extension';
import { isAxiosError, TransportRequestService } from '@sap-ux/axios-extension';
import type { Logger } from '@sap-ux/logger';
import { writeFileSync } from 'fs';
import type { AbapDeployConfig } from '../types';
import { getConfigForLogging } from './config';
import { promptConfirmation } from './prompt';
import { createAbapServiceProvider, getCredentialsWithPrompts } from '@sap-ux/system-access';
import { validateBeforeDeploy, formatSummary } from './validate';

const deploymentCommands = { tryUndeploy, tryDeploy };

/**
 * Internal deployment commands
 */
const enum TryCommands {
    Deploy = 'tryDeploy',
    UnDeploy = 'tryUndeploy'
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
 */
async function handleError(
    command: TryCommands,
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
    command: TryCommands,
    provider: AbapServiceProvider,
    config: AbapDeployConfig,
    logger: Logger,
    archive: Buffer
) {
    logger.warn('An app in the same repository with different sap app id found.');
    if (config.yes || (await promptConfirmation('Do you want to overwrite (Y/n)?'))) {
        await deploymentCommands[command](provider, { ...config, safe: false, retry: false }, logger, archive);
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
    command: TryCommands,
    provider: AbapServiceProvider,
    config: AbapDeployConfig,
    logger: Logger,
    archive: Buffer
) {
    logger.warn(`${command === TryCommands.Deploy ? 'Deployment' : 'Undeployment'} failed with authentication error.`);
    logger.info(
        'Please maintain correct credentials to avoid seeing this error\n\t(see help: https://www.npmjs.com/package/@sap/ux-ui5-tooling#setting-environment-variables-in-a-env-file)'
    );
    logger.info('Please enter your credentials.');
    const service = getUi5AbapRepositoryService(provider, config, logger);
    const credentials = await getCredentialsWithPrompts(service.defaults.auth?.username);
    if (Object.keys(credentials).length) {
        if (config.target.serviceKey) {
            config.target.serviceKey.uaa.username = credentials.username;
            config.target.serviceKey.uaa.password = credentials.password;
        } else {
            config.credentials = credentials;
        }
        await runCommand(command, config, logger, archive);
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
    command: TryCommands,
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
        provider = await createAbapServiceProvider(
            config.target,
            {
                auth: config.credentials,
                ignoreCertErrors: !config.strictSsl
            },
            !!config.target.scp,
            logger
        );
    }
    const adtService = await provider.getAdtService<TransportRequestService>(TransportRequestService);
    const transportRequest = await adtService?.createTransportRequest({
        packageName: config.app.package ?? '',
        ui5AppName: config.app.name,
        description: 'Created by @sap-ux/deploy-tooling'
    });
    if (transportRequest) {
        logger.info(`Transport request ${transportRequest} created for application ${config.app.name}.`);
        return transportRequest;
    }
    throw new Error(`Transport request could not be created for application ${config.app.name}.`);
}

/**
 * Generic method to run the deployment request i.e. deploy | undeploy.
 *
 * @param command - the request type deploy | undeploy to be executed
 * @param config - deployment configuration
 * @param logger - reference to the logger instance
 * @param archive - archive file that is to be deployed
 */
async function runCommand(
    command: TryCommands,
    config: AbapDeployConfig,
    logger: Logger,
    archive: Buffer = Buffer.from('')
): Promise<void> {
    const provider = await createAbapServiceProvider(
        config.target,
        {
            auth: config.credentials,
            ignoreCertErrors: !config.strictSsl
        },
        !!config.target.scp,
        logger
    );
    logger.info(
        `Starting to ${command === TryCommands.Deploy ? 'deploy' : 'undeploy'}${config.test === true ? ' in test mode' : ''
        }.`
    );
    await deploymentCommands[command](provider, config, logger, archive);
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
            // Reset as we dont want other flows kicking it off again!
            config.createTransport = false;
        }

        let validateOutput;
        if (config.test === true) {
            validateOutput = await validateBeforeDeploy(
                {
                    appName: config.app.name,
                    description: config.app.description ?? '',
                    package: config.app.package ?? '',
                    transport: config.app.transport ?? '',
                    client: config.target.client ?? '',
                    url: config.target.url ?? ''
                },
                provider,
                logger
            );
            if (!validateOutput.result) {
                logger.info(`Results of validating the deployment configuration settings:${formatSummary(validateOutput.summary)}`);
            }
        }
        const service = getUi5AbapRepositoryService(provider, config, logger);
        await service.deploy({ archive, bsp: config.app, testMode: config.test, safeMode: config.safe });
        if (config.test === true) {
            logger.info(
                'Deployment in TestMode completed. A successful TestMode execution does not necessarily mean that your upload will be successful.'
            );
        } else {
            logger.info('Deployment Successful.');
        }
    } catch (error) {
        await handleError(TryCommands.Deploy, error, provider, config, logger, archive);
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
    await runCommand(TryCommands.Deploy, config, logger, archive);
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
        if (config.createTransport) {
            config.app.transport = await createTransportRequest(config, logger, provider);
            config.createTransport = false;
        }
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
