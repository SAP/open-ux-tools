import type { Logger } from '@sap-ux/logger';
import { getService, BackendSystemKey } from '@sap-ux/store';
import type { BackendSystem } from '@sap-ux/store';
import type { AbapTarget, UrlAbapTarget } from '../types';
import { isAppStudio } from '@sap-ux/btp-utils';
import prompts from 'prompts';
import { PasswordPrompt, UsernamePrompt } from './prompts';

export type BasicAuth = Required<Pick<BackendSystem, 'username' | 'password'>>;
export type ServiceAuth = Required<Pick<BackendSystem, 'serviceKeys' | 'name'>> & { refreshToken?: string };

/**
 * Check the secure storage if it has credentials for the given target.
 *
 * @param target ABAP target
 * @returns credentials from the store or undefined.
 */
export async function getCredentialsFromStore<T extends BasicAuth | ServiceAuth | undefined>(
    target: UrlAbapTarget,
    log: Logger
): Promise<T | undefined> {
    try {
        if (!isAppStudio()) {
            const systemService = await getService<BackendSystem, BackendSystemKey>({ entityName: 'system' });
            let system = await systemService.read(new BackendSystemKey({ url: target.url, client: target.client }));
            // check if there are credentials for the default client
            if (!system && target.client) {
                system = await systemService.read(new BackendSystemKey({ url: target.url }));
            }
            return system as T;
        }
    } catch (error) {
        log.warn('Reading credentials from store failed');
        log.debug(error.message);
    }
    return undefined;
}

export function getCredentialsFromEnvVariables(): BasicAuth | undefined {
    if (process.env.FIORI_TOOLS_USER && process.env.FIORI_TOOLS_PASSWORD) {
        return {
            username: process.env.FIORI_TOOLS_USER,
            password: process.env.FIORI_TOOLS_PASSWORD
        }
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
            ...UsernamePrompt,
            initial: username,
        }, PasswordPrompt
    ]);
    return credentials as BasicAuth;
}
