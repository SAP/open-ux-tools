import type { CommonPromptOptions, YUIQuestion } from '@sap-ux/inquirer-common';
import { extendWithOptions } from '@sap-ux/inquirer-common';
import type { OdataVersion } from '@sap-ux/odata-service-writer';
import type { ConfirmQuestion, InputQuestion, PasswordQuestion, Question } from 'inquirer';
import { t } from '../../../i18n';
import type { OdataServiceAnswers, OdataServicePromptOptions } from '../../../types';
import { hostEnvironment, promptNames } from '../../../types';
import { PromptState, getHostEnvironment } from '../../../utils';
import LoggerHelper from '../../logger-helper';
import { ConnectionValidator } from './connectionValidator';
import { serviceUrlInternalPromptNames } from './types';
import { validateService } from './validators';

/**
 * Internal only answers to service URL prompting not returned with OdataServiceAnswers.
 */
interface ServiceUrlAnswers extends OdataServiceAnswers {
    /**
     * The full service URL as input by the user.
     */
    [promptNames.serviceUrl]?: string;
    /**
     * Ignore certificate error
     */
    [serviceUrlInternalPromptNames.ignoreCertError]?: boolean;
    /**
     * Username for the service where basic authentication is required.
     */
    [serviceUrlInternalPromptNames.username]?: string;
    /**
     * Password for the service where basic authentication is required.
     */
    [promptNames.serviceUrlPassword]?: string;
}

/**
 * Prompt for the service URL.
 *
 * @param connectValidator Connection validator instance
 * @param requiredVersion The required OData version of the service
 * @returns the service URL prompt
 */
function getServiceUrlPrompt(connectValidator: ConnectionValidator, requiredVersion?: OdataVersion) {
    return {
        type: 'input',
        name: promptNames.serviceUrl,
        guiOptions: {
            hint: 'https://<hostname>:<port>/path/to/odata/service/',
            mandatory: true,
            breadcrumb: true
        },
        message: t('prompts.odataServiceUrl.message', { odataVersion: requiredVersion }),
        validate: async (url: string) => {
            const urlValidationState = await connectValidator.validateUrl(url);
            // Check if we have a cert error, the user will be prompted to ignore it later
            if (connectValidator.validity.canSkipCertError) {
                return true;
            }

            if (urlValidationState === true) {
                if (!connectValidator.validity.authRequired) {
                    return validateService(url, requiredVersion, connectValidator);
                }
                return true;
            }
            return urlValidationState;
        }
    } as InputQuestion<ServiceUrlAnswers>;
}

/**
 * Prompt to ignore cert errors.
 *
 * @param connectValidator Connection validator instance
 * @param requiredVersion The required OData version of the service
 * @returns the ignore cert errors prompt
 */
function getIgnoreCertErrorsPrompt(
    connectValidator: ConnectionValidator,
    requiredVersion?: OdataVersion
): ConfirmQuestion<ServiceUrlAnswers> {
    return {
        when: (answers: ServiceUrlAnswers) => {
            // const errorType = errorHandler.getCurrentErrorType(hostEnv !== hostEnvironment.cli ? true : false);
            if (answers.serviceUrl && connectValidator.validity.canSkipCertError) {
                return true;
            }
            return false;
        },
        type: 'confirm',
        name: serviceUrlInternalPromptNames.ignoreCertError,
        message: t('prompts.ignoreCertErrors.message'),
        default: false,
        validate: async (ignoreCertError: boolean, { serviceUrl }: ServiceUrlAnswers) => {
            if (!serviceUrl) {
                return false;
            }

            if (ignoreCertError) {
                LoggerHelper.logger.warn(t('prompts.validationMessages.warningCertificateValidationDisabled'));
            }

            const validUrl = await connectValidator.validateUrl(serviceUrl, ignoreCertError, true);

            if (validUrl === true) {
                if (!connectValidator.validity.authRequired) {
                    return validateService(serviceUrl, requiredVersion, connectValidator, ignoreCertError);
                }
                return true;
            }
            return validUrl;
        }
    } as ConfirmQuestion<ServiceUrlAnswers>;
}

/* 
// todo: implement validateUrlAndService and use it in getIgnoreCertErrorsPromp, getServiceUrlPrompt and cliIgnoreCertValidatePrompt
function validateUrlAndService(connectionValidator: ConnectionValidator, answers: ServiceUrlAnswers, requiredVersion?: OdataVersion) {
    if () {
        LoggerHelper.logger.warn(t('prompts.validationMessages.warningCertificateValidationDisabled'));
    }

    const validUrl = await connectionValidator.validateUrl({
        serviceUrl: answers.serviceUrl,
        ignoreCertError,
        forceReValidation: true
    });

    if (validUrl === true) {
        if (!connectValidator.validity.authRequired) {
            return validateService(
                {
                    url: answers.serviceUrl,
                    requiredVersion
                },
                connectValidator,
                ignoreCertError
            );
        }
        return true;
    }
    return validUrl;
} */

/**
 * Prompt used to validate the service based on ignoring cert errors since 'confirm' prompt validators don't run on CLI.
 *
 * @param connectValidator Connection validator instance
 * @param requiredVersion The required OData version of the service
 * @returns the ignore cert errors cli only prompt
 */
function getCliIgnoreCertValidatePrompt(
    connectValidator: ConnectionValidator,
    requiredVersion?: OdataVersion
): Question<ServiceUrlAnswers> {
    const hostEnv = getHostEnvironment();
    return {
        // Add dummy prompt for CLI to revalidate since "confirm" prompt validators don't run on CLI
        when: async ({ serviceUrl, ignoreCertError }: ServiceUrlAnswers) => {
            if (hostEnv === hostEnvironment.cli && serviceUrl) {
                if (ignoreCertError === false) {
                    throw new Error('User terminated generation. Certificate validation is required.');
                }
                LoggerHelper.logger.warn(t('prompts.validationMessages.warningCertificateValidationDisabled'));
                // Re-check if auth required
                const validUrl = await connectValidator.validateUrl(serviceUrl, ignoreCertError, true);
                if (validUrl === true) {
                    if (!connectValidator.validity.authRequired) {
                        // Will log on CLI
                        const validService = await validateService(serviceUrl, requiredVersion, connectValidator, true);
                        if (validService !== true) {
                            throw new Error(validService.toString());
                        }
                    }
                } else {
                    throw new Error(validUrl.toString()); // exit
                }
            }
            return false;
        },
        name: serviceUrlInternalPromptNames.cliIgnoreCertValidate
    };
}

/**
 * Prompt for the username.
 *
 * @param connectValidator Connection validator instance
 * @returns the username prompt
 */
function getUsernamePrompt(connectValidator: ConnectionValidator): InputQuestion<ServiceUrlAnswers> {
    return {
        when: async ({ serviceUrl, ignoreCertError }: ServiceUrlAnswers) => {
            return connectValidator.validity.reachable
                ? await connectValidator.isAuthRequired(serviceUrl, ignoreCertError)
                : false;
        },
        type: 'input',
        name: serviceUrlInternalPromptNames.username,
        message: t('prompts.serviceUsername.message'),
        guiOptions: {
            mandatory: true
        },
        validate: (user: string) => (user && user.length > 0 ? true : false)
    } as InputQuestion<ServiceUrlAnswers>;
}

/**
 * Prompt for the password.
 *
 * @param connectValidator Connection validator instance
 * @param requiredVersion The required OData version of the service
 * @returns the password prompt
 */
function getPasswordPrompt(
    connectValidator: ConnectionValidator,
    requiredVersion?: OdataVersion
): PasswordQuestion<ServiceUrlAnswers> {
    return {
        when: async ({ serviceUrl, ignoreCertError }: ServiceUrlAnswers) => {
            return connectValidator.validity.reachable
                ? await connectValidator.isAuthRequired(serviceUrl, ignoreCertError)
                : false;
        },
        type: 'password',
        guiOptions: {
            applyDefaultWhenDirty: true,
            mandatory: true
        },
        name: promptNames.serviceUrlPassword,
        message: t('prompts.servicePassword.message'),
        guiType: 'login',
        mask: '*',
        validate: async (password: string, { username, serviceUrl, ignoreCertError }: ServiceUrlAnswers) => {
            if (!serviceUrl || !username || !password) {
                return false;
            }
            const validAuth = await connectValidator.validateAuth(
                serviceUrl,
                username,
                password,
                undefined,
                ignoreCertError
            );
            if (validAuth === true) {
                return validateService(serviceUrl, requiredVersion, connectValidator);
            }
            return validAuth;
        }
    } as PasswordQuestion<ServiceUrlAnswers>;
}

/**
 * Get the service URL questions.
 *
 * @param promptOptions prompt options that can be passed to the service URL questions to configure behaviour
 * @param promptOptions.serviceUrl see {@link OdataServicePromptOptions}
 * @param promptOptions.serviceUrlPassword see {@link OdataServicePromptOptions}
 * @returns the odata service URL questions
 */
export function getServiceUrlQuestions({
    serviceUrl: serviceUrlOpts,
    serviceUrlPassword: passwordOpts
}: OdataServicePromptOptions = {}): Question<OdataServiceAnswers>[] {
    // Connection validator maintains connection state and validity across multiple prompts
    const connectValidator = new ConnectionValidator();
    const requiredVersion = serviceUrlOpts?.requiredOdataVersion;
    PromptState.reset();

    let questions = [
        getServiceUrlPrompt(connectValidator, requiredVersion),
        getIgnoreCertErrorsPrompt(connectValidator, requiredVersion),
        getCliIgnoreCertValidatePrompt(connectValidator, requiredVersion),
        getUsernamePrompt(connectValidator),
        getPasswordPrompt(connectValidator, requiredVersion)
    ];

    // Add additional messages to prompts if specified in the prompt options
    let promptsOptToExtend: Record<string, CommonPromptOptions> = {};

    // todo: for each prompt option with additionalMessages
    if (serviceUrlOpts?.additionalMessages) {
        promptsOptToExtend = { serviceUrl: serviceUrlOpts };
    }
    if (passwordOpts?.additionalMessages) {
        promptsOptToExtend = { ...promptsOptToExtend, serviceUrlPassword: passwordOpts };
    }

    if (promptsOptToExtend) {
        questions = extendWithOptions(questions as YUIQuestion[], promptsOptToExtend, PromptState.odataService);
    }
    return questions;
}
