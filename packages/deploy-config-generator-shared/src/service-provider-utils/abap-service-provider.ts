import { isAppStudio } from '@sap-ux/btp-utils';
import { createAbapServiceProvider } from '@sap-ux/system-access';
import { AuthenticationType } from '@sap-ux/store';
import { type Logger } from '@sap-ux/logger';
import type { AbapServiceProvider } from '@sap-ux/axios-extension';
import type { DestinationAbapTarget, UrlAbapTarget } from '@sap-ux/system-access';
import type { BackendTarget, Credentials, SystemConfig } from '../types';
import type { AbapTarget } from '@sap-ux/ui5-config';
import { PromptState } from '../prompts/prompt-state';

let abapServiceProvider: AbapServiceProvider | undefined;
let system: SystemConfig;

/**
 * Get or create an abap service provider.
 *
 * @param systemConfig - system configuration
 * @param logger
 * @param backendTarget - backend target from prompt options
 * @param credentials - user credentials
 * @returns abap service provider
 */
export async function getOrCreateServiceProvider(
    systemConfig: SystemConfig,
    logger: Logger,
    backendTarget?: BackendTarget,
    credentials?: Credentials
): Promise<AbapServiceProvider> {
    // use cached service provider
    if (abapServiceProvider && isSameSystem(systemConfig, system?.url, system?.client, system?.destination)) {
        return abapServiceProvider;
    }
    // use connected service provider
    if (
        backendTarget?.serviceProvider &&
        isSameSystem(
            systemConfig,
            backendTarget?.abapTarget.url,
            backendTarget?.abapTarget.client,
            backendTarget?.abapTarget.destination
        )
    ) {
        abapServiceProvider = backendTarget.serviceProvider as AbapServiceProvider;
        system = backendTarget.abapTarget;
        return abapServiceProvider;
    }
    abapServiceProvider = await createNewServiceProvider(logger, credentials);
    return abapServiceProvider;
}

/**
 * Create a new abap service provider using @sap-ux/system-access.
 *
 * @param logger
 * @param credentials - user credentials
 * @returns abap service provider
 */
async function createNewServiceProvider(logger: Logger, credentials?: Credentials): Promise<AbapServiceProvider> {
    let abapTarget: AbapTarget;
    if (isAppStudio()) {
        abapTarget = { destination: PromptState.abapDeployConfig.destination } as DestinationAbapTarget;
    } else {
        abapTarget = {
            url: PromptState.abapDeployConfig.url,
            client: PromptState.abapDeployConfig.client,
            scp: PromptState.abapDeployConfig.scp
        } as UrlAbapTarget;
        if (PromptState.abapDeployConfig.isS4HC) {
            abapTarget.authenticationType = AuthenticationType.ReentranceTicket;
        }
    }

    let auth;
    if (credentials?.username && credentials?.password) {
        auth = {
            username: credentials.username,
            password: credentials.password
        };
    }

    const requestOptions = {
        ignoreCertErrors: false,
        auth
    };

    const serviceProvider = await createAbapServiceProvider(abapTarget, requestOptions, false, logger);

    system = {
        url: PromptState.abapDeployConfig.url,
        client: PromptState.abapDeployConfig.client,
        destination: PromptState.abapDeployConfig.destination
    };

    return serviceProvider;
}

/**
 * An abapServiceProvider is cached when it is created. However, we have scenarios such as to test
 * query the backend and then show user credential prompts if getting 401 error response. In this case,
 * we need to clear the cached service provider, and allow createNewServiceProvider to be called again
 * after user provided user credentials.
 */
export function deleteCachedServiceProvider(): void {
    abapServiceProvider = undefined;
}

/**
 * Check if the current system is the same as the one in the answers.
 *
 * @param abapSystem - system configuration
 * @param url - url
 * @param client - client
 * @param destination - destination
 * @returns true if the system is the same
 */
function isSameSystem(abapSystem?: SystemConfig, url?: string, client?: string, destination?: string): boolean {
    return Boolean(
        (abapSystem?.url &&
            abapSystem.url.trim()?.replace(/\/$/, '') === url?.trim()?.replace(/\/$/, '') &&
            abapSystem.client === client) ??
            (!!abapSystem?.destination && destination === abapSystem?.destination)
    );
}
