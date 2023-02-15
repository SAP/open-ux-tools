import type { AxiosBasicCredentials } from 'axios';
import type { Choice } from 'prompts';
import { prompt } from 'prompts';
import { yellow, cyan, red } from 'chalk';
import { isAppStudio } from '@sap-ux/btp-utils';
import type { ToolsLogger } from '@sap-ux/logger';
import { QuestionType } from '../types/prompt';
import { t } from '..';
import type { Service, ServiceConfig } from '..';
import { checkConnection, getServices, getSystemCredentials } from '../smartlinks-config';

/**
 * @description Returns prompt result to provide or use service parameters
 * @param services possible services to be offered for prompt
 * @returns service to be used from prompt
 */
const getServicePrompt = async (services?: Service[]): Promise<ServiceConfig> => {
    const service = services?.[0];
    const { url, client } = await prompt([
        {
            name: QuestionType.Url,
            type: 'text',
            initial: service?.url,
            message: service ? `${t('questions.service')} (${service?.source})` : `${t('questions.service')}`,
            validate: (value: string): boolean | string => {
                if (!value || !value.trim()) {
                    return `${t('error.service')}`;
                } else {
                    return true;
                }
            }
        },
        {
            name: QuestionType.Client,
            type: 'text',
            initial: service?.client,
            message: service?.client ? `${t('questions.client')} (${service?.source})` : `${t('questions.client')}`
        }
    ]);
    return { url, client };
};

/**
 * @description Prompts the user for credentials.
 * @param log logger to report info to the user
 * @returns prompted user and password serialized for a basic auth header
 */
export async function promptUserPass(log?: ToolsLogger): Promise<AxiosBasicCredentials | undefined> {
    if (isAppStudio()) {
        const { authNeeded } = await prompt([
            {
                type: 'confirm',
                name: 'authNeeded',
                message: `${cyan(t('info.authNeeded'))}`
            }
        ]);
        if (!authNeeded) {
            return undefined;
        }
    } else {
        log?.info(yellow(t('info.credentialsRequired')));
    }

    const { username, password } = await prompt(
        [
            {
                type: 'text',
                name: QuestionType.Username,
                message: `${cyan(t('info.username'))}`,
                validate: (value: string): boolean | string => {
                    if (!value || !value.trim()) {
                        return `${t('error.emptyUsername')}`;
                    } else {
                        return true;
                    }
                }
            },
            {
                type: 'invisible',
                name: QuestionType.Password,
                message: `${cyan(t('info.password'))}`,
                validate: (value: string): boolean | string => {
                    if (!value || !value.trim()) {
                        return `${t('error.emptyPassword')}`;
                    } else {
                        return true;
                    }
                }
            }
        ],
        {
            onCancel: () => {
                log?.info(yellow(t('info.operationAborted')));
                return process.exit(1);
            }
        }
    );
    return { username, password };
}

/**
 * @description Returns prompt result for credentials
 * @param service service parameters to be checked for existing credentials
 * @param logger logger to report info to the user
 * @returns credentials to be used from prompt
 */
const getCredentialsPrompt = async (
    service: ServiceConfig,
    logger?: ToolsLogger
): Promise<AxiosBasicCredentials | undefined> => {
    const auth = await getSystemCredentials(service.url, service.client);
    if (auth?.username) {
        const choices: Choice[] = [
            { title: `Use ${auth.username}`, value: auth },
            { title: t('questions.credentialsDescription'), value: false }
        ];
        const { credentials } = await prompt([
            { name: QuestionType.Credentials, type: 'select', message: t('questions.credentials'), choices, initial: 0 }
        ]);
        if (credentials) {
            return credentials;
        }
    }
    return promptUserPass(logger);
};

/**
 * @description Return the list of questions to configure smartlinks.
 * @param basePath - path to project root, where ui5-deploy.yaml or ui5.yaml is
 * @param logger logger to report info to the user
 * @returns - array of questions that serves as input for prompt module
 */
export async function getSmartLinksServicePrompt(
    basePath: string,
    logger?: ToolsLogger
): Promise<ServiceConfig | undefined> {
    const services = await getServices(basePath, logger);
    const service = await getServicePrompt(services);
    const credentials = await getCredentialsPrompt(service, logger);
    const connectionStatus = await checkConnection(service, credentials, logger);
    if (connectionStatus) {
        logger?.info(cyan(t('info.connectSuccess')));
        return { ...service, credentials };
    }
    logger?.error(red(t('error.connectError')));
    return undefined;
}
