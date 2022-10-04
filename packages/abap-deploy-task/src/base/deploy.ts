import type {
    AbapServiceProvider,
    ProviderConfiguration,
    Ui5AbapRepositoryService,
    AxiosRequestConfig
} from '@sap-ux/axios-extension';
import {
    AbapCloudEnvironment,
    createForAbap,
    createForDestination,
    createForAbapOnCloud
} from '@sap-ux/axios-extension';
import type { ServiceInfo } from '@sap-ux/btp-utils';
import { isAppStudio } from '@sap-ux/btp-utils';
import type { Logger } from '@sap-ux/logger';
import type { BackendSystem } from '@sap-ux/store';
import { getService, BackendSystemKey } from '@sap-ux/store';
import { writeFileSync } from 'fs';
import type { AbapDeployConfig, AbapTarget, CommonOptions } from '../types';

type BasicAuth = Required<Pick<BackendSystem, 'username' | 'password'>>;
type ServiceAuth = Required<Pick<BackendSystem, 'serviceKeys' | 'refreshToken'>>;

/**
 * Check the secure storage if it has credentials for the given target.
 *
 * @param config
 * @param target
 */
export async function getCredentials<T extends BasicAuth | ServiceAuth | undefined>(
    target: AbapTarget
): Promise<T | undefined> {
    if (!isAppStudio() && target.url) {
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
 * Create an instance of a UI5AbapRepository service connected to the given target configuration.
 *
 * @param target - target system for the deployments
 * @param config
 * @returns service instance
 */
async function createDeployService(target: AbapTarget, config: CommonOptions): Promise<Ui5AbapRepositoryService> {
    let provider: AbapServiceProvider;
    const options: AxiosRequestConfig & Partial<ProviderConfiguration> = {};
    if (config.strictSsl === false) {
        options.ignoreCertErrors = true;
    }
    if (isAppStudio() && target.destination) {
        provider = createForDestination(options, {
            Name: target.destination
        }) as AbapServiceProvider;
    } else if (target.url) {
        if (target.scp) {
            const storedOpts = await getCredentials<ServiceAuth>(target);
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
            options.baseURL = target.url;
            if (target.client) {
                options.params = { 'sap-client': target.client };
            }
            const storedOpts = await getCredentials<BasicAuth>(target);
            if (storedOpts?.password) {
                options.auth = {
                    username: storedOpts.username,
                    password: storedOpts.password
                };
            }
            provider = createForAbap(options);
        }
    } else {
        throw new Error('TODO');
    }
    return provider.getUi5AbapRepository();
}

/**
 * Deploy the given archive to the given target using the given app description.
 *
 * @param archive
 * @param target
 * @param app
 * @param testMode - if set to true then only a test deployment is executed without deploying the actual archive in the backend
 * @param config
 */
export async function deploy(archive: Buffer, config: AbapDeployConfig, logger: Logger) {
    if (config.keep) {
        writeFileSync(`archive-${Date.now()}.zip`, archive);
    }
    const service = await createDeployService(config.target, config);
    try {
        if (!config.strictSsl) {
            logger.warn(
                'You chose not to validate SSL certificate. Please verify the server certificate is trustful before proceeding. See documentation for recommended configuration (https://help.sap.com/viewer/17d50220bcd848aa854c9c182d65b699/Latest/en-US/4b318bede7eb4021a8be385c46c74045.html).'
            );
        }
        logger.info(`Starting deployment${config.test === true ? ' in test mode' : ''}.`);
        await service.deploy(archive, config.app, config.test);
    } catch (e) {
        logger.error(
            'Deployment has failed. Please ensure there is a valid deployment archive file in the dist folder of the application that can be deployed.'
        );
        logger.debug((e as Error).message);
        throw e;
    }
}
