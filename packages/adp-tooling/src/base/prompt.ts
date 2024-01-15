import prompts from 'prompts';
import type { AdpWriterConfig } from '../types';
import { createAbapServiceProvider } from '@sap-ux/system-access';
import { ToolsLogger } from '@sap-ux/logger';

export const enum flexLayer {
    CUSTOMER_BASE = 'CUSTOMER_BASE',
    VENDOR = 'VENDOR'
}

export type PromptDefaults = {
    id?: string;
    reference?: string;
    url?: string;
    ft?: boolean;
    package?: string;
    transport?: string;
};

/**
 * Prompt the user for the required properties for an adaptation project.
 *
 * @param defaults optional default values for the prompts
 * @param logger
 * @returns a configuration for the adp writer
 */
export async function promptGeneratorInput(
    defaults: PromptDefaults = {},
    logger = new ToolsLogger()
): Promise<AdpWriterConfig> {
    const target = await prompts([
        {
            type: 'text',
            name: 'url',
            message: 'Target system url:',
            initial: defaults.url,
            validate: (input) => input?.length > 0
        },
        {
            type: 'text',
            name: 'client',
            message: 'Client (optional):',
            validate: (input) => (input ? input.length < 4 : true)
        }
    ]);
    const provider = await createAbapServiceProvider(target, {}, true, logger);
    const ato = await provider.getAtoInfo();
    logger.info(ato);
    const app = await prompts([
        {
            type: 'select',
            choices: [
                { title: flexLayer.CUSTOMER_BASE, value: flexLayer.CUSTOMER_BASE },
                { title: flexLayer.VENDOR, value: flexLayer.VENDOR }
            ],
            name: 'layer',
            message: 'Flex layer:'
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
            initial: defaults.id,
            format: (input, values) => {
                if (values.layer === flexLayer.CUSTOMER_BASE && !input.startsWith('customer.')) {
                    return `customer.${input}`;
                } else {
                    return input;
                }
            },
            validate: (input) => input?.length > 0
        },
        {
            type: 'text',
            name: 'reference',
            message: 'Original application id:',
            initial: defaults.reference,
            validate: (input) => input?.length > 0
        },
        {
            type: 'text',
            name: 'title',
            message: 'Application title:'
        }
    ]);
    const deploy = await prompts([
        {
            type: 'text',
            name: 'package',
            message: 'Deployment package:',
            initial: defaults.package ?? '$TMP',
            validate: (input) => input?.length > 0
        },
        {
            type: 'text',
            name: 'transport',
            message: 'Transport request (optional):',
            initial: defaults.transport
        }
    ]);
    const options = await prompts([
        {
            type: 'confirm',
            name: 'fioriTools',
            message: 'Enable Fiori tools?',
            initial: defaults.ft !== false,
            validate: (input) => input?.length > 0
        }
    ]);
    return { app, target, options, deploy };
}
