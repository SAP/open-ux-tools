import type { Logger } from '@sap-ux/logger';
import type { AbapTarget, UrlAbapTarget } from '../types';
import type { ServiceInfo } from '@sap-ux/axios-extension';
import {
    AbapCloudEnvironment,
    type AbapCloudStandaloneOptions,
    type AbapServiceProvider,
    type AxiosRequestConfig,
    type ProviderConfiguration,
    createForAbapOnCloud,
    createForAbap,
    createForDestination
} from '@sap-ux/axios-extension';
import type { BasicAuth, ServiceAuth } from './credentials';
import { getCredentialsFromStore, getCredentialsWithPrompts } from './credentials';
import { isAppStudio, listDestinations } from '@sap-ux/btp-utils';
import { ServiceKeysPathPrompt } from './prompts';
import prompts from 'prompts';
import { readFileSync } from 'fs';

/**
 * Checks if credentials are of basic auth type.
 *
 * @param authOpts credential options
 * @returns boolean
 */
function isBasicAuth(authOpts: Partial<BasicAuth> | ServiceAuth | undefined): authOpts is BasicAuth {
    return !!authOpts && (authOpts as BasicAuth).password !== undefined;
}

/**
 * Checks if credentials are of service auth type.
 *
 * @param authOpts credential options
 * @returns boolean
 */
function isServiceAuth(authOpts: Partial<BasicAuth> | ServiceAuth | undefined): authOpts is ServiceAuth {
    return !!authOpts && (authOpts as ServiceAuth).serviceKeys !== undefined;
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
 * Enhance axios options and create a service provider instance for an ABAP Cloud system.
 *
 * @param options - predefined axios options
 * @param target - url target configuration
 * @param prompt - prompt the user for missing information
 * @param logger - reference to the logger instance
 * @returns an abap service provider
 */
async function createAbapCloudServiceProvider(
    options: AxiosRequestConfig,
    target: UrlAbapTarget,
    prompt: boolean,
    logger: Logger
): Promise<AbapServiceProvider> {
    const providerConfig: Partial<AbapCloudStandaloneOptions & ProviderConfiguration> = {
        ...options,
        environment: AbapCloudEnvironment.Standalone,
        service: target.serviceKey
    };
    if (!providerConfig.service) {
        // first try reading the keys from the store
        try {
            const storedOpts = await getCredentialsFromStore<ServiceAuth>(target, logger);
            if (storedOpts) {
                providerConfig.service = storedOpts.serviceKeys as ServiceInfo;
                providerConfig.refreshToken = storedOpts.refreshToken;
                logger.info(`Using system [${storedOpts.name}] from System store`);
            }
        } catch (error) {
            // something went wrong but it doesn't matter, we could still prompt the user
            logger.warn('Could not read service keys from store.');
            logger.debug(error.message);
        }
        if (!providerConfig.service && prompt) {
            const { path } = await prompts(ServiceKeysPathPrompt);
            providerConfig.service = JSON.parse(readFileSync(path, 'utf-8')) as ServiceInfo;
        }
    }

    // if no keys are available throw and error
    if (providerConfig.service) {
        return createForAbapOnCloud(providerConfig as AbapCloudStandaloneOptions);
    } else {
        throw new Error('Service keys required for ABAP Cloud environment.');
    }
}

/**
 * Enhance axios options and create a service provider instance for an on-premise ABAP system.
 *
 * @param options predefined axios options
 * @param target url target configuration
 * @param prompt - prompt the user for missing information
 * @param logger reference to the logger instance
 * @returns an ABAPServiceProvider instance
 */
async function createAbapOnPremServiceProvider(
    options: AxiosRequestConfig,
    target: UrlAbapTarget,
    prompt: boolean,
    logger: Logger
): Promise<AbapServiceProvider> {
    options.baseURL = target.url;
    if (target.client) {
        options.params['sap-client'] = target.client;
    }
    if (!options.auth) {
        let storedOpts: Partial<BasicAuth> | ServiceAuth | undefined;
        try {
            storedOpts = await getCredentialsFromStore(target, logger);
        } catch (error) {
            // something went wrong but it doesn't matter, we could still prompt the user
            logger.warn('Could not read credentials from store.');
            logger.debug(error.message);
        }
        if (isBasicAuth(storedOpts)) {
            options.auth = {
                username: storedOpts.username,
                password: storedOpts.password
            };
        } else {
            if (isServiceAuth(storedOpts)) {
                throw new Error('This is an ABAP Cloud system, please correct your configuration.');
            }
            if (prompt) {
                const credentials = await getCredentialsWithPrompts(storedOpts?.username);
                options.auth = credentials;
                process.env.FIORI_TOOLS_USER = credentials.username;
                process.env.FIORI_TOOLS_PASSWORD = credentials.password;
            }
        }
    }
    return createForAbap(options);
}

/**
 * Create an instance of an ABAP service provider connected to the given target configuration.
 *
 * @param target - target configuration
 * @param requestOptions - additional AxiosRequestOptions
 * @param prompt - prompt the user for missing information
 * @param logger - optional reference to the logger instance
 * @returns service instance
 */
export async function createAbapServiceProvider(
    target: AbapTarget,
    requestOptions: (AxiosRequestConfig & Partial<ProviderConfiguration>) | undefined,
    prompt: boolean,
    logger: Logger
): Promise<AbapServiceProvider> {
    let provider: AbapServiceProvider;
    const options: AxiosRequestConfig & Partial<ProviderConfiguration> = {
        params: target.params ?? {},
        ...requestOptions
    };
    // Destination only supported on Business Application studio
    if (isAppStudio() && target.destination) {
        // Need additional properties to determine the type of destination we are dealing with
        const destinations = await listDestinations();
        const destination = destinations?.[target.destination];
        if (!destination) {
            throw new Error(`Destination ${target.destination} not found on subaccount`);
        }
        provider = createForDestination(options, destination) as AbapServiceProvider;
    } else if (isUrlTarget(target)) {
        if (target.cloud) {
            provider = await createAbapCloudServiceProvider(options, target, prompt, logger);
        } else {
            provider = await createAbapOnPremServiceProvider(options, target, prompt, logger);
        }
    } else {
        throw new Error('Unable to handle the configuration in the current environment.');
    }
    return provider;
}
