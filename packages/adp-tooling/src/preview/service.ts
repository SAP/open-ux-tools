import type { Logger } from '@sap-ux/logger';
import type { BackendSystem } from '@sap-ux/store';
import { getService, BackendSystemKey } from '@sap-ux/store';
import type { ServiceInfo } from '@sap-ux/btp-utils';
import { isAppStudio, listDestinations } from '@sap-ux/btp-utils';
import type { AbapTarget, AdpPreviewConfig, UrlAbapTarget } from '../types';
import type {
    AbapCloudStandaloneOptions,
    AbapServiceProvider,
    AxiosRequestConfig,
    ProviderConfiguration
} from '@sap-ux/axios-extension';
import { AbapCloudEnvironment, createForAbap, createForDestination } from '@sap-ux/axios-extension';
import { createForAbapOnCloud } from '@sap-ux/axios-extension';
import { promptServiceKeys } from './prompt';
import type { ZipFile } from 'yazl';

type BasicAuth = Required<Pick<BackendSystem, 'username' | 'password'>>;
type ServiceAuth = Required<Pick<BackendSystem, 'serviceKeys' | 'name'>> & { refreshToken?: string };

/**
 * Create a buffer based on the given zip file object.
 *
 * @param zip object representing a zip file
 * @returns a buffer
 */
export async function createBuffer(zip: ZipFile): Promise<Buffer> {
    await new Promise<void>((resolve) => {
        zip.end({ forceZip64Format: false }, () => {
            resolve();
        });
    });

    const chunks: Buffer[] = [];
    for await (const chunk of zip.outputStream) {
        chunks.push(chunk as Buffer);
    }

    return Buffer.concat(chunks);
}

/**
 * Check the secure storage if it has credentials for the given target.
 *
 * @param target ABAP target
 * @returns credentials from the store or undefined.
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
 * @param logger - reference to the logger instance
 * @returns an abap service provider
 */
async function createAbapCloudServiceProvider(
    options: AxiosRequestConfig,
    target: UrlAbapTarget,
    logger?: Logger
): Promise<AbapServiceProvider> {
    const providerConfig: Partial<AbapCloudStandaloneOptions & ProviderConfiguration> = {
        ...options,
        environment: AbapCloudEnvironment.Standalone
    };
    // first try reading the keys from the store
    const storedOpts = await getCredentials<ServiceAuth>(target);
    if (logger && storedOpts) {
        providerConfig.service = storedOpts.serviceKeys as ServiceInfo;
        providerConfig.refreshToken = storedOpts.refreshToken;
        logger.info(`Using system [${storedOpts.name}] from System store`);
    }
    // next prompt the user for the keys
    if (!storedOpts) {
        providerConfig.service = await promptServiceKeys();
    }
    // if no keys are available throw and error
    if (providerConfig.service) {
        return createForAbapOnCloud(providerConfig as AbapCloudStandaloneOptions);
    } else {
        throw new Error('Service keys required for deployment to an ABAP Cloud environment.');
    }
}

/**
 * Enhance axios options and create a service provider instance for an on-premise ABAP system.
 *
 * @param options predefined axios options
 * @param target url target configuration
 * @returns an ABAPServiceProvider instance
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
 * Check if it is a url or destination target.
 *
 * @param target target configuration
 * @returns true is it is a UrlAbapTarget
 */
export function isUrlTarget(target: AbapTarget): target is UrlAbapTarget {
    return (<UrlAbapTarget>target).url !== undefined;
}

/**
 * Create an instance of a UI5AbapRepository service connected to the given target configuration.
 *
 * @param config - deployment configuration
 * @param logger - optional reference to the logger instance
 * @returns service instance
 */
export async function createProvider(config: AdpPreviewConfig, logger?: Logger): Promise<AbapServiceProvider> {
    let provider: AbapServiceProvider;
    const options: AxiosRequestConfig & Partial<ProviderConfiguration> = { 
        params: {},
        ignoreCertErrors: config.ignoreCertErrors
    };
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
        if (config.target.scp) {
            provider = await createAbapCloudServiceProvider(options, config.target, logger);
        } else {
            provider = await createAbapServiceProvider(options, config.target);
        }
    } else {
        throw new Error('Unable to handle the configuration in the current environment.');
    }
    return provider;
}
