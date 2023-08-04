import { Logger } from "@sap-ux/logger";
import { AbapTarget, UrlAbapTarget } from "../types";
import {
    AbapCloudEnvironment,
    ServiceInfo,
    type AbapCloudStandaloneOptions,
    type AbapServiceProvider,
    type AxiosRequestConfig,
    type ProviderConfiguration,
    createForAbapOnCloud,
    createForAbap,
    createForDestination
} from '@sap-ux/axios-extension';
import { BasicAuth, ServiceAuth, getCredentialsFromStore, getCredentialsWithPrompts } from "./credentials";
import { isAppStudio, listDestinations } from "@sap-ux/btp-utils";
import { ServiceKeysPathPrompt } from "./prompts";
import prompts from "prompts";
import { readFileSync } from "fs";

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
    logger: Logger
): Promise<AbapServiceProvider> {
    const providerConfig: Partial<AbapCloudStandaloneOptions & ProviderConfiguration> = {
        ...options,
        environment: AbapCloudEnvironment.Standalone
    };
    // first try reading the keys from the store
    const storedOpts = await getCredentialsFromStore<ServiceAuth>(target, logger);
    if (logger && storedOpts) {
        providerConfig.service = storedOpts.serviceKeys as ServiceInfo;
        providerConfig.refreshToken = storedOpts.refreshToken;
        logger.info(`Using system [${storedOpts.name}] from System store`);
    }
    // next prompt the user for the keys
    if (!storedOpts) {
        const { path } = await prompts(ServiceKeysPathPrompt);
        providerConfig.service = JSON.parse(readFileSync(path, 'utf-8')) as ServiceInfo;
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
 * @param logger reference to the logger instance
 * @returns an ABAPServiceProvider instance
 */
async function createAbapServiceProvider(
    options: AxiosRequestConfig,
    target: UrlAbapTarget,
    logger: Logger
): Promise<AbapServiceProvider> {
    options.baseURL = target.url;
    if (target.client) {
        options.params['sap-client'] = target.client;
    }
    if (!options.auth) {
        let storedOpts: BasicAuth | undefined;
        try {
            storedOpts = await getCredentialsFromStore<BasicAuth>(target, logger);
        } catch (error) {
            logger.debug('Could not read credentials from store.');
            // something went wrong but it doesn't matter, we just prompt the user
        }
        if (storedOpts?.username && storedOpts?.password) {
            options.auth = {
                username: storedOpts.username,
                password: storedOpts.password
            };
        } else {
            const credentials = await getCredentialsWithPrompts(storedOpts?.username);
            options.auth = credentials;
            process.env.FIORI_TOOLS_USER = credentials.username;
            process.env.FIORI_TOOLS_PASSWORD = credentials.password;
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
export async function createProvider(target: AbapTarget, ignoreCertErrors: boolean | undefined, logger: Logger): Promise<AbapServiceProvider> {
    let provider: AbapServiceProvider;
    const options: AxiosRequestConfig & Partial<ProviderConfiguration> = {
        params: {},
        ignoreCertErrors: ignoreCertErrors
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
        if (target.scp) {
            provider = await createAbapCloudServiceProvider(options, target, logger);
        } else {
            provider = await createAbapServiceProvider(options, target, logger);
        }
    } else {
        throw new Error('Unable to handle the configuration in the current environment.');
    }
    return provider;
}