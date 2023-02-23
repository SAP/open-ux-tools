import type { AxiosBasicCredentials } from 'axios';
import { yellow, cyan } from 'chalk';
import type { Choice, PromptObject } from 'prompts';
import { prompt } from 'prompts';
import { getDestinationUrlForAppStudio, isAppStudio } from '@sap-ux/btp-utils';
import type { ToolsLogger } from '@sap-ux/logger';
import { FileName } from '@sap-ux/project-access';
import { t } from '../i18n';
import { getTargetDefinition, getSystemCredentials } from '../smartlinks-config';
import type { BasicTarget, TargetConfig, DeployTarget } from '../types';

/**
 * @description Returns target parameters from prompt
 * @param target possible deploy target to be offered for prompt
 * @param logger logger to report info to the user
 * @returns target url and client
 */
const getTargetPrompt = async (target?: DeployTarget, logger?: ToolsLogger): Promise<BasicTarget> => {
    const cancel = {
        onCancel: () => {
            logger?.info(yellow(t('info.operationAborted')));
            return process.exit(1);
        }
    };
    const validator = (value: string, error: string): boolean | string => {
        if (!value || !value.trim()) {
            return t(error);
        } else {
            return true;
        }
    };

    let targetUrl = target?.url;
    if (isAppStudio() && !!target?.destination) {
        targetUrl = getDestinationUrlForAppStudio(
            target.destination,
            target?.url ? new URL(target.url).pathname : undefined
        );
    }
    const questions: PromptObject[] = [
        {
            name: 'url',
            type: 'text',
            initial: targetUrl,
            message: t('questions.target', { file: targetUrl ? `(${FileName.UI5DeployYaml})` : '' }),
            validate: (value: string) => validator(value, 'error.target')
        },
        {
            name: 'client',
            type: 'text',
            initial: target?.client,
            message: t('questions.client', { file: target?.client ? `(${FileName.UI5DeployYaml})` : '' }),
            format: (val: number | any) => (typeof val === 'number' ? val.toString() : val)
        }
    ];
    const { url, client } = await prompt(questions, cancel);
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
 * @description Returns prompt result for credentials
 * @param target target parameters to be checked for existing credentials
 * @param logger logger to report info to the user
 * @returns credentials to be used from prompt
 */
const getCredentialsPrompt = async (
    target: BasicTarget,
    logger?: ToolsLogger
): Promise<AxiosBasicCredentials | undefined> => {
    const auth = await getSystemCredentials(target.url, target.client);
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
    return promptUserPass(logger);
};

/**
 * @description Return the list of questions to configure smartlinks.
 * @param basePath - path to project root, where ui5-deploy.yaml is
 * @param logger logger to report info to the user
 * @returns - array of questions that serves as input for prompt module
 */
export async function getSmartLinksTargetFromPrompt(basePath: string, logger?: ToolsLogger): Promise<TargetConfig> {
    const definition = await getTargetDefinition(basePath, logger);
    const target = await getTargetPrompt(definition?.target, logger);
    const credentials = await getCredentialsPrompt(target, logger);
    return { target, credentials, ignoreCertError: definition?.ignoreCertError };
}
