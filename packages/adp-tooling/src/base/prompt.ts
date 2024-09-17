import { v4 as uuidv4 } from 'uuid';
import prompts, { type Answers } from 'prompts';
import type { CustomConfig, AdpWriterConfig } from '../types';
import type { AbapTarget } from '@sap-ux/system-access';
import { createAbapServiceProvider } from '@sap-ux/system-access';
import type { Logger } from '@sap-ux/logger';
import type { UI5FlexLayer } from '@sap-ux/project-access';
import type { AppIndex } from '@sap-ux/axios-extension';
import { validateClient, validateEmptyString } from '@sap-ux/project-input-validator';
import { getPackageJSONInfo } from '../writer/project-utils';

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
    defaults: PromptDefaults | undefined,
    logger: Logger
): Promise<AdpWriterConfig> {
    defaults = defaults ?? {};
    const { target, apps, layer, customConfig } = await promptTarget(defaults, logger);
    const app = await prompts([
        {
            type: 'autocomplete',
            name: 'reference',
            message: 'Original application:',
            initial: defaults.reference,
            choices: apps.map((app) => ({
                title: `${app['sap.app/title']} (${(app['sap.fiori/registrationIds'] ?? []).join(',')})`,
                value: app['sap.app/id']
            })),
            suggest: (input, choices) => Promise.resolve(choices.filter((i) => i.title.includes(input)))
        },
        {
            type: 'text',
            name: 'id',
            message: (_prev) => {
                if (layer === 'CUSTOMER_BASE') {
                    return 'New adaptation id (prefix "customer" will be automatically added to the id):';
                } else {
                    return 'New adaptation id:';
                }
            },
            initial: defaults.id,
            format: (input) => {
                if (layer === 'CUSTOMER_BASE' && !input.startsWith('customer.')) {
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
        deploy,
        customConfig
    };
}

/**
 * Prompt the user for the target system.
 *
 * @param defaults default values for the prompts
 * @param logger logger instance
 * @returns apps, layer, target url and client
 */
export async function promptTarget(
    defaults: PromptDefaults,
    logger: Logger
): Promise<{ apps: AppIndex; layer: UI5FlexLayer; target: AbapTarget; customConfig: CustomConfig }> {
    let count = 0;
    let target: Answers<'url' | 'client'> = { url: defaults.url, client: defaults.client };
    while (count < 3) {
        try {
            count++;
            target = await prompts([
                {
                    type: 'text',
                    name: 'url',
                    message: 'Target system url:',
                    initial: target.url,
                    validate: validateEmptyString,
                    format: (input) => input.trim()
                },
                {
                    type: 'text',
                    name: 'client',
                    message: 'Client (optional):',
                    initial: target.client,
                    validate: validateClient
                }
            ]);
            const systemInfo = await fetchSystemInformation(target, defaults.ignoreCertErrors, logger);
            return { target, ...systemInfo };
        } catch (error) {
            logger.error('Error while fetching system information. Please check your input.');
            logger.debug(error.message);
            if (error.code === 'UNABLE_TO_GET_ISSUER_CERT_LOCALLY') {
                logger.error('If you are using a self-signed certificate, please use the --ignore-cert-errors flag.');
                const confirm = await prompts([
                    {
                        type: 'confirm',
                        name: 'ignoreCertErrors',
                        message: 'Do you want to ignore certificate errors?'
                    }
                ]);
                defaults.ignoreCertErrors = confirm.ignoreCertErrors;
            }
        }
    }
    throw new Error('Unable to fetch system information.');
}

/**
 * Fetches the system information from the target system.
 *
 * @param target target system
 * @param ignoreCertErrors ignore certificate errors
 * @param logger logger instance
 * @returns app index and layer
 */
async function fetchSystemInformation(
    target: prompts.Answers<'url' | 'client'>,
    ignoreCertErrors: boolean | undefined,
    logger: Logger
): Promise<{ apps: AppIndex; layer: UI5FlexLayer; customConfig: CustomConfig }> {
    const provider = await createAbapServiceProvider(
        target,
        {
            ignoreCertErrors
        },
        true,
        logger
    );
    logger.info('Fetching system information...');
    const ato = await provider.getAtoInfo();
    const layer = ato.tenantType === 'SAP' ? 'VENDOR' : 'CUSTOMER_BASE';
    const packageJson = getPackageJSONInfo();
    const customConfig: CustomConfig = {
        adp: {
            environment: ato.operationsType ?? 'P',
            support: {
                id: packageJson.name,
                version: packageJson.version,
                toolsId: uuidv4()
            }
        }
    };
    logger.info(`Target layer: ${layer}`);
    logger.info('Fetching list of available applications... (it can take a moment)');
    const appIndex = provider.getAppIndex();

    const searchParams: Record<string, string> = {
        'sap.ui/technology': 'UI5',
        'sap.app/type': 'application'
    };
    if (customConfig.adp.environment === 'C') {
        searchParams['sap.fiori/cloudDevAdaptationStatus'] = 'released';
    }

    const apps = await appIndex.search(searchParams, ['sap.app/id', 'sap.app/title', 'sap.fiori/registrationIds']);
    return { apps, layer, customConfig };
}
