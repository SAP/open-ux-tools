import type { ServiceInfo } from '@sap-ux/btp-utils';
import { existsSync, readFileSync } from 'fs';
import prompts from 'prompts';
import type { AdpWriterConfig } from '../types';

const enum flexLayer {
    CUSTOMER_BASE = 'CUSTOMER_BASE',
    VENDOR = 'VENDOR'
}
/**
 * Prompt the user for the required properties for an adaptation project.
 *
 * @param defaults optional default values for the prompts
 * @param defaults.id initial id to be used for the new adaptation id prompt
 * @param defaults.reference initial id used for the original application id prompt
 * @param defaults.url initial url used for the target url prompt
 * @returns a configuration for the adp writer
 */
export async function promptGeneratorInput({
    id,
    reference,
    url
}: { id?: string; reference?: string; url?: string } = {}): Promise<AdpWriterConfig> {
    const app = await prompts([
        {
            type: 'select',
            choices: [
                { title: flexLayer.CUSTOMER_BASE, value: flexLayer.CUSTOMER_BASE },
                { title: flexLayer.VENDOR, value: flexLayer.VENDOR }
            ],
            name: 'layer',
            message: 'Flex layer:'
            // initial: 0
        },
        {
            type: 'text',
            name: 'id',
            message: (_prev, values) => {
                if (values.layer === flexLayer.CUSTOMER_BASE) {
                    return 'New adaptation id (CUSTOMER_BASE selected, customer prefix will be automatically added to the id):';
                } else {
                    return 'New adaptation id:';
                }
            },
            initial: id,
            format: (input, values) => {
                if (values.layer === flexLayer.CUSTOMER_BASE && !input.startsWith('customer.')) {
                    return `customer.${input}`;
                } else {
                    return input;
                }
            }
        },
        {
            type: 'text',
            name: 'reference',
            message: 'Original application id:',
            initial: reference,
            validate: (input) => input?.length > 0
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
    return { app, target };
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
