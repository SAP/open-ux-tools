import type { AxiosBasicCredentials } from 'axios';
import { yellow, cyan } from 'chalk';
import type { Choice, PromptObject } from 'prompts';
import { prompt } from 'prompts';
import { isAppStudio, listDestinations } from '@sap-ux/btp-utils';
import type { ToolsLogger } from '@sap-ux/logger';
import { FileName } from '@sap-ux/project-access';
import { t } from '../i18n';
import { getLocalStoredCredentials, getTargetDefinition } from '../smartlinks-config';
import type { TargetConfig, DeployTarget } from '../types';

/**
 * Returns deploy questions for prompt
 *
 * @param target deploy target definition
 * @returns Prompt object array of questions
 */
const getTargetPromptQuestions = (target?: DeployTarget) => {
    const validator = (value: string, error: string): boolean | string => {
        if (!value || !value.trim()) {
            return t(error);
        } else {
            return true;
        }
    };
    const questions: PromptObject[] = [];
    if (isAppStudio()) {
        questions.push({
            name: 'destination',
            type: 'text',
            initial: target?.destination,
            message: t('questions.target', {
                type: 'destination',
                file: target?.destination ? `(${FileName.UI5DeployYaml})` : ''
            }),
            validate: (value: string) => validator(value, 'error.target')
        });
    } else {
        questions.push(
            {
                name: 'url',
                type: 'text',
                initial: target?.url,
                message: t('questions.target', {
                    type: 'url',
                    file: target?.url ? `(${FileName.UI5DeployYaml})` : ''
                }),
                validate: (value: string) => validator(value, 'error.target')
            },
            {
                name: 'client',
                type: 'text',
                initial: target?.client,
                message: t('questions.client', {
                    file: target?.client ? `(${FileName.UI5DeployYaml})` : ''
                }),
                format: (val: number | any) => (typeof val === 'number' ? val.toString() : val)
            }
        );
    }
    return questions;
};

/**
 * Returns target parameters from prompt
 *
 * @param config possible deploy config with target to be offered for prompt
 * @param logger logger to report info to the user
 * @returns target configuration
 */
const getTargetPrompt = async (config?: TargetConfig, logger?: ToolsLogger): Promise<DeployTarget> => {
    const cancel = {
        onCancel: () => {
            logger?.info(yellow(t('info.operationAborted')));
            return process.exit(1);
        }
    };
    const questions = getTargetPromptQuestions(config?.target);
    const { url, client, destination } = await prompt(questions, cancel);
    return { url, client, destination };
};

/**
 * Prompts the user for credentials.
 *
 * @param log logger to report info to the user
 * @returns prompted user and password serialized for a basic auth header
 */
export async function promptUserPass(log?: ToolsLogger): Promise<AxiosBasicCredentials> {
    const { username, password } = await prompt(
        [
            {
                type: 'text',
                name: 'username',
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
                name: 'password',
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
 * Returns credentials from target or from prompt
 *
 * @param target target definition to be checked for existing credentials
 * @param logger logger to report info to the user
 * @returns credentials for target definition
 */
async function getCredentialsPrompt(
    target: DeployTarget,
    logger?: ToolsLogger
): Promise<AxiosBasicCredentials | undefined> {
    if (isAppStudio() && target.destination) {
        const destinations = await listDestinations();
        const destination = destinations?.[target.destination];
        if (destination?.Authentication === 'NoAuthentication') {
            logger?.info(t('info.credentialsRequired'));
            return await promptUserPass(logger);
        } else if (destination) {
            logger?.info(t('info.credentialsAvailable'));
            return undefined;
        }
    } else if (target.url) {
        const auth = await getLocalStoredCredentials(target.url, target.client, logger);
        if (auth?.username) {
            const choices: Choice[] = [
                { title: `Use ${auth.username}`, value: auth },
                { title: t('questions.credentialsDescription'), value: false }
            ];
            const { credentials } = await prompt([
                { name: 'credentials', type: 'select', message: t('questions.credentials'), choices, initial: 0 }
            ]);
            if (credentials) {
                return credentials;
            }
        }
    }
    return promptUserPass(logger);
}

/**
 * Return the list of questions to configure smartlinks.
 *
 * @param basePath - path to project root, where ui5-deploy.yaml is
 * @param logger logger to report info to the user
 * @returns - array of questions that serves as input for prompt module
 */
export async function getSmartLinksTargetFromPrompt(basePath: string, logger?: ToolsLogger): Promise<TargetConfig> {
    const definition = await getTargetDefinition(basePath, logger);
    const target = await getTargetPrompt(definition, logger);
    const auth = await getCredentialsPrompt(target, logger);
    return { target, auth, ignoreCertErrors: definition?.ignoreCertErrors };
}
