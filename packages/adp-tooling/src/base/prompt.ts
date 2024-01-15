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
    client?: string;
    ignoreCertErrors?: boolean;
    ft?: boolean;
    package?: string;
    transport?: string;
};

/**
 * Prompt the user for the required properties for an adaptation project.
 *
 * @param defaults optional default values for the prompts
 * @param logger optional logger instance
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
            initial: defaults.client,
            validate: (input) => (input ? input.length < 4 : true)
        }
    ]);
    const provider = await createAbapServiceProvider(
        target,
        {
            ignoreCertErrors: defaults.ignoreCertErrors
        },
        true,
        logger
    );
    logger.info('Fetching system information...');
    const ato = await provider.getAtoInfo();
    const layer = ato.tenantType === 'SAP' ? 'VENDOR' : 'CUSTOMER_BASE';
    logger.info(`Target layer: ${layer}`);
    logger.info('Fetching list of available applications... (this can take a moment)');
    const appIndex = await provider.getAppIndex();
    const apps = (await appIndex.search(
        {
            'sap.ui/technology': 'UI5',
            'sap.app/type': 'application'
        },
        'sap.app/id,sap.fiori/registrationIds,sap.app/title'.split(',')
    )) as any[];

    const app = await prompts([
        {
            type: 'autocomplete',
            name: 'reference',
            message: 'Original application:',
            initial: defaults.reference,
            choices: apps.map((app) => ({
                title: `${app['sap.app/title']} (${app['sap.fiori/registrationIds'].join(',')})`,
                value: app['sap.app/id']
            })),
            suggest: (input, choices) => Promise.resolve(choices.filter((i) => i.title.includes(input)))
        },
        {
            type: 'text',
            name: 'id',
            message: (_prev) => {
                if (ato.tenantType !== 'SAP') {
                    return 'New adaptation id (prefix "customer" will be automatically added to the id):';
                } else {
                    return 'New adaptation id:';
                }
            },
            initial: defaults.id,
            format: (input) => {
                if (ato.tenantType !== 'SAP' && !input.startsWith('customer.')) {
                    return `customer.${input}`;
                } else {
                    return input;
                }
            },
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

    return {
        app: {
            ...app,
            layer
        },
        target,
        options,
        deploy
    };
}
