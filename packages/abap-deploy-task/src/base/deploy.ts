import type {
    AbapServiceProvider,
    ProviderConfiguration,
    Ui5AbapRepositoryService,
    AxiosRequestConfig,
    AxiosError
} from '@sap-ux/axios-extension';
import {
    AbapCloudEnvironment,
    createForAbap,
    createForDestination,
    createForAbapOnCloud,
    isAxiosError
} from '@sap-ux/axios-extension';
import type { ServiceInfo } from '@sap-ux/btp-utils';
import { isAppStudio } from '@sap-ux/btp-utils';
import type { Logger } from '@sap-ux/logger';
import type { BackendSystem } from '@sap-ux/store';
import { getService, BackendSystemKey } from '@sap-ux/store';
import { writeFileSync } from 'fs';
import type { AbapDeployConfig, UrlAbapTarget } from '../types';
import { getConfigForLogging, isUrlTarget } from './config';
import { promptConfirmation, promptCredentials } from './prompt';

type BasicAuth = Required<Pick<BackendSystem, 'username' | 'password'>>;
type ServiceAuth = Required<Pick<BackendSystem, 'serviceKeys' | 'refreshToken'>>;

/**
 * Check the secure storage if it has credentials for the given target.
 *
 * @param target
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
    }
}

/**
 * Enhance axios options and create a service provided instance.
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
        options.params = { 'sap-client': target.client };
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
 * @returns service instance
 */
async function createDeployService(config: AbapDeployConfig): Promise<Ui5AbapRepositoryService> {
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

    if (isUrlTarget(config.target)) {
        if (config.target.scp) {
            const storedOpts = await getCredentials<ServiceAuth>(config.target);
            if (storedOpts) {
                provider = createForAbapOnCloud({
                    ...options,
                    environment: AbapCloudEnvironment.Standalone,
                    service: storedOpts.serviceKeys as ServiceInfo,
                    refreshToken: storedOpts.refreshToken
                });
            } else {
                throw new Error('TODO');
            }
        } else {
            provider = await createAbapServiceProvider(options, config.target);
        }
    } else if (isAppStudio()) {
        provider = createForDestination(options, {
            Name: config.target.destination
        }) as AbapServiceProvider;
    } else {
        throw new Error('TODO');
    }
    return provider.getUi5AbapRepository();
}

/**
 * Deploy the given archive to the given target using the given app description.
 *
 * @param archive
 * @param config
 * @param logger - reference to the logger instance
 */
export async function deploy(archive: Buffer, config: AbapDeployConfig, logger: Logger) {
    if (config.keep) {
        writeFileSync(`archive-${Date.now()}.zip`, archive);
    }
    const service = await createDeployService(config);
    if (!config.strictSsl) {
        logger.warn(
            'You chose not to validate SSL certificate. Please verify the server certificate is trustful before proceeding. See documentation for recommended configuration (https://help.sap.com/viewer/17d50220bcd848aa854c9c182d65b699/Latest/en-US/4b318bede7eb4021a8be385c46c74045.html).'
        );
    }
    logger.info(`Starting deployment${config.test === true ? ' in test mode' : ''}.`);
    await tryDeploy(archive, service, config, logger);
    logger.info('Deployment successful.');
}

/**
 *
 * @param archive
 * @param service
 * @param config
 * @param logger
 */
async function tryDeploy(archive: Buffer, service: Ui5AbapRepositoryService, config: AbapDeployConfig, logger: Logger) {
    try {
        await service.deploy(archive, config.app, config.test);
    } catch (e) {
        if (!config.noRetry && isAxiosError(e)) {
            const success = await handleAxiosError(e.response, archive, service, config, logger);
            if (success) {
                return;
            }
        }
        logger.error('Deployment has failed.');
        logger.debug(getConfigForLogging(config));
        throw e;
    }
}

/**
 * Main function for different deploy retry handling.
 *
 * @param response - response of that trigged and axios error
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
            if (credentials) {
                service.defaults.auth = credentials;
            } else {
                return false;
            }
            await tryDeploy(archive, service, config, logger);
            return true;
        case 412:
            logger.warn('An app in the same repository with different sap app id found.');
            if (config.yes || (await promptConfirmation('Do you want to overwrite (Y/n)?'))) {
                await tryDeploy(archive, service, { ...config, safe: false }, logger);
                return true;
            } else {
                return false;
            }
        default:
            return false;
    }
}
