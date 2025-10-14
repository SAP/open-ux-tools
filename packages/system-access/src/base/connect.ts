import type { Logger } from '@sap-ux/logger';
import type { AbapTarget, DestinationAbapTarget, UrlAbapTarget } from '../types';
import type {
    AbapCloudStandaloneOptions,
    AbapServiceProvider,
    AxiosError,
    AxiosRequestConfig,
    ProviderConfiguration,
    ServiceInfo
} from '@sap-ux/axios-extension';
import {
    AbapCloudEnvironment,
    createForAbapOnCloud,
    createForAbap,
    createForDestination
} from '@sap-ux/axios-extension';
import {
    getCredentialsFromEnvVariables,
    getCredentialsFromStore,
    getCredentialsWithPrompts,
    isBasicAuth,
    isServiceAuth
} from './credentials';
import { isAppStudio, listDestinations } from '@sap-ux/btp-utils';
import { questions } from './prompts';
import prompts from 'prompts';
import { readFileSync } from 'node:fs';
import { AuthenticationType } from '@sap-ux/store';

/**
 * Check if it is a url target.
 *
 * @param target target configuration
 * @returns true if it is a UrlAbapTarget
 */
export function isUrlTarget(target: AbapTarget): target is UrlAbapTarget {
    return (<UrlAbapTarget>target).url !== undefined;
}

/**
 * Check if it is a destination target.
 *
 * @param target target configuration
 * @returns true if it is a DestinationAbapTarget
 */
export function isDestinationTarget(target: AbapTarget): target is DestinationAbapTarget {
    return (<DestinationAbapTarget>target).destination !== undefined;
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
        const storedOpts = await getCredentialsFromStore(target, logger);
        if (isServiceAuth(storedOpts)) {
            providerConfig.service = storedOpts.serviceKeys as ServiceInfo;
            providerConfig.refreshToken = storedOpts.refreshToken;
            logger.info(`Using system [${storedOpts.name}] from System store`);
        }
        if (!providerConfig.service && prompt) {
            const { path } = await prompts(questions.serviceKeysPath);
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
    if (!options.auth) {
        const storedOpts = await getCredentialsFromStore(target, logger);
        if (isBasicAuth(storedOpts)) {
            options.auth = {
                username: storedOpts.username,
                password: storedOpts.password
            };
        } else {
            if (isServiceAuth(storedOpts)) {
                throw new Error('This is an ABAP Cloud system, please correct your configuration.');
            }
            options.auth ??= getCredentialsFromEnvVariables();
            if (!options.auth && prompt) {
                const { authType } = await prompts([questions.authType]);
                if (authType === AuthenticationType.ReentranceTicket) {
                    target.authenticationType = AuthenticationType.ReentranceTicket;
                } else {
                    const credentials = await getCredentialsWithPrompts(storedOpts?.username);
                    options.auth = credentials;
                    process.env.FIORI_TOOLS_USER = credentials.username;
                    process.env.FIORI_TOOLS_PASSWORD = credentials.password;
                }
            }
        }
    }
    return target.authenticationType === AuthenticationType.ReentranceTicket
        ? createForAbapOnCloud({
              ...options,
              ...target,
              environment: AbapCloudEnvironment.EmbeddedSteampunk
          })
        : createForAbap(options);
}

/**
 * Enhance axios options and create a service provider instance for a destination.
 *
 * @param options predefined axios options
 * @param target url target configuration
 * @param prompt - prompt the user for missing information
 * @returns an ABAPServiceProvider instance
 */
async function createAbapDestinationServiceProvider(
    options: AxiosRequestConfig,
    target: DestinationAbapTarget,
    prompt: boolean
): Promise<AbapServiceProvider> {
    // Need additional properties to determine the type of destination we are dealing with
    const destinations = await listDestinations();
    const destination = destinations?.[target.destination];
    if (!destination) {
        throw new Error(`Destination ${target.destination} not found on subaccount`);
    }
    const provider = createForDestination(options, destination) as AbapServiceProvider;
    // if prompting is enabled, check if the destination works or basic auth is required
    if (prompt) {
        const id = provider.interceptors.response.use(undefined, async (error: AxiosError) => {
            provider.interceptors.response.eject(id);
            if (error.response?.status === 401) {
                const credentials = await getCredentialsWithPrompts();
                provider.defaults.auth = credentials;
                process.env.FIORI_TOOLS_USER = credentials.username;
                process.env.FIORI_TOOLS_PASSWORD = credentials.password;
                return provider.request(error.config!);
            } else {
                throw error;
            }
        });
    }
    return provider;
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
    // Destination only supported in Business Application Studio
    if (isAppStudio() && isDestinationTarget(target)) {
        provider = await createAbapDestinationServiceProvider(options, target, prompt);
    } else if (isUrlTarget(target)) {
        if (target.scp || target.serviceKey) {
            provider = await createAbapCloudServiceProvider(options, target, prompt, logger);
        } else if (target.authenticationType === AuthenticationType.ReentranceTicket) {
            provider = createForAbapOnCloud({
                ignoreCertErrors: options.ignoreCertErrors,
                environment: AbapCloudEnvironment.EmbeddedSteampunk,
                ...target
            });
        } else {
            options.baseURL = target.url;
            if (target.client) {
                options.params['sap-client'] = target.client;
            }
            provider = await createAbapOnPremServiceProvider(options, target, prompt, logger);
        }
    } else {
        throw new Error('Unable to handle the configuration in the current environment.');
    }
    return provider;
}
