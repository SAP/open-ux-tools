import type { Logger } from '@sap-ux/logger';
import { getService, BackendSystemKey, BackendSystem } from '@sap-ux/store';
import type { UrlAbapTarget } from '../types';
import { isAppStudio } from '@sap-ux/btp-utils';
import prompts from 'prompts';
import { questions } from './basePrompts';

export type BasicAuth = Required<Pick<BackendSystem, 'username' | 'password'>>;
export type ServiceAuth = Required<Pick<BackendSystem, 'serviceKeys' | 'name' | 'refreshToken'>>;

/**
 * Checks if credentials are of basic auth type.
 *
 * @param authOpts credential options
 * @returns boolean
 */
export function isBasicAuth(authOpts: BackendSystem | BasicAuth | undefined): authOpts is BasicAuth {
    return !!authOpts && (authOpts as BasicAuth).password !== undefined;
}

/**
 * Checks if credentials are of service auth type.
 *
 * @param authOpts credential options
 * @returns boolean
 */
export function isServiceAuth(authOpts: BackendSystem | ServiceAuth | undefined): authOpts is ServiceAuth {
    return !!authOpts && (authOpts as ServiceAuth).serviceKeys !== undefined;
}

/**
 * Check the secure storage if it has credentials for the given target.
 *
 * @param target ABAP target
 * @param logger - reference to the logger instance
 * @returns credentials from the store or undefined.
 */
export async function getCredentialsFromStore(
    target: UrlAbapTarget,
    logger: Logger
): Promise<BackendSystem | undefined> {
    try {
        if (!isAppStudio()) {
            const systemService = await getService<BackendSystem, BackendSystemKey>({ entityName: 'system' });
            let system = await systemService.read(new BackendSystemKey({ url: target.url, client: target.client }));
            // check if there are credentials for the default client
            if (!system && target.client) {
                system = await systemService.read(new BackendSystemKey({ url: target.url }));
            }
            return system;
        }
    } catch (error) {
        logger.warn('Reading credentials from store failed');
        logger.debug(error.message);
    }
    return undefined;
}

/**
 * Store the credentials in the secure storage.
 *
 * @param name system name
 * @param target target
 * @param target.url system url
 * @param target.client optional system client
 * @param credentials basic auth credentials
 * @param credentials.username username
 * @param credentials.password password
 * @param logger reference to the logger instance
 * @returns true if the credentials are successfully stored
 */
export async function storeCredentials(
    name: string,
    target: { url: string; client?: string },
    credentials: { username: string; password: string },
    logger: Logger
): Promise<boolean> {
    try {
        const systemService = await getService<BackendSystem, BackendSystemKey>({ entityName: 'system' });
        const system = new BackendSystem({
            name,
            ...target,
            ...credentials
        });
        await systemService.write(system);
        return true;
    } catch (error) {
        logger.error('Could not store credentials.');
        logger.debug(error);
        return false;
    }
}

/**
 * Checks the environment variables for Fiori tools settings.
 *
 * @returns basic auth credentials from the environment or undefined.
 */
export function getCredentialsFromEnvVariables(): BasicAuth | undefined {
    if (process.env.FIORI_TOOLS_USER && process.env.FIORI_TOOLS_PASSWORD) {
        return {
            username: process.env.FIORI_TOOLS_USER,
            password: process.env.FIORI_TOOLS_PASSWORD
        };
    } else {
        return undefined;
    }
}

/**
 * Prompt for username and password.
 *
 * @param username - optional username that is to be offered as default
 * @returns credentials object with username/password
 */
export async function getCredentialsWithPrompts(username?: string): Promise<BasicAuth> {
    const credentials = await prompts([
        {
            ...questions.username,
            initial: username
        },
        questions.password
    ]);
    return credentials as BasicAuth;
}
