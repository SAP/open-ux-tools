import type { ServiceInfo } from '@sap-ux/btp-utils';
import { existsSync, readFileSync } from 'fs';
import prompts from 'prompts';
import { AdpWriterConfig } from '../types';

/**
 * Prompt the user for the required properties for an adaptation project.
 *
 * @param defaults optional default values for the prompts
 * @returns a configuration for the adp writer 
 */
export async function promptGeneratorInput({ id, reference, url }: { id?: string, reference?: string, url?: string} = {}): Promise<AdpWriterConfig> {
    const app = await prompts([
        {
            type: 'text',
            name: 'id',
            message: 'New adaptation id:',
            initial: id,
            validate: (input) => input?.length > 0 
        },
        {
            type: 'text',
            name: 'reference',
            message: 'Original application id:',
            initial: reference,
            validate: (input) => input?.length > 0 
        },
        {
            type: 'select',
            choices: [{ title: 'CUSTOMER_BASE' }, { title: 'VENDOR' }],
            name: 'layer',
            initial: 0,
            message: 'Flex layer:'
        },
        {
            type: 'text',
            name: 'title',
            message: 'Application title:'
        }
    ]);
    const target = await prompts([
        {
            type: 'text',
            name: 'url',
            message: 'Target system url:',
            initial: url,
            validate: (input) => input?.length > 0 
        }
    ]);
    return { app, target};
}

/**
 * Prompt for username and password.
 *
 * @param username - optional username that is to be offered as default
 * @returns credentials object with username/password
 */
export async function promptCredentials(username?: string) {
    const credentials = await prompts([
        {
            type: 'text',
            name: 'username',
            initial: username,
            message: 'Username:'
        },
        {
            type: 'password',
            name: 'password',
            message: 'Password:'
        }
    ]);
    return credentials;
}

/**
 * Prompt for the location of the service keys.
 *
 * @returns credentials object with service keys
 */
export async function promptServiceKeys() {
    const { path } = await prompts([
        {
            type: 'text',
            name: 'path',
            message: 'Please provide the service keys as file:',
            validate: (input) => existsSync(input)
        }
    ]);
    return JSON.parse(readFileSync(path, 'utf-8')) as ServiceInfo;
}
