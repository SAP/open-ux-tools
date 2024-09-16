import type { CommonPromptOptions, YUIQuestion } from '@sap-ux/inquirer-common';
import { extendWithOptions } from '@sap-ux/inquirer-common';
import type { OdataVersion } from '@sap-ux/odata-service-writer';
import type { ConfirmQuestion, InputQuestion, PasswordQuestion, Question } from 'inquirer';
import { t } from '../../../i18n';
import type { OdataServiceAnswers, OdataServicePromptOptions } from '../../../types';
import { hostEnvironment, promptNames } from '../../../types';
import { PromptState, getHostEnvironment } from '../../../utils';
import { ConnectionValidator } from '../../connectionValidator';
import LoggerHelper from '../../logger-helper';
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
                if (!connectValidator.validity.authRequired && connectValidator.odataService) {
                    return validateService(
                        url,
                        {
                            odataService: connectValidator.odataService,
                            axiosConfig: connectValidator.axiosConfig
                        },
                        requiredVersion
                    );
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
        when: ({ serviceUrl }: ServiceUrlAnswers) => {
            if (serviceUrl && connectValidator.validity.canSkipCertError) {
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

            const validUrl = await connectValidator.validateUrl(serviceUrl, {
                ignoreCertError,
                forceReValidation: true
            });

            if (validUrl === true) {
                if (!connectValidator.validity.authRequired && connectValidator.odataService) {
                    return validateService(
                        serviceUrl,
                        {
                            odataService: connectValidator.odataService,
                            axiosConfig: connectValidator.axiosConfig
                        },
                        requiredVersion,
                        ignoreCertError
                    );
                }
                return true;
            }
            return validUrl;
        }
    } as ConfirmQuestion<ServiceUrlAnswers>;
}
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
    return {
        // Add dummy prompt for CLI to revalidate since "confirm" prompt validators don't run on CLI
        // The `when` condition should never return true (so it does not get rendered in GUI prompts) but will throw an error to exit generation
        // if the user chooses to not ignore cert errors or if the odata service is not valid
        when: async ({ serviceUrl, ignoreCertError }: ServiceUrlAnswers) => {
            if (serviceUrl && connectValidator.validity.canSkipCertError) {
                // If the user choose to not ignore cert errors, we cannot continue
                if (!ignoreCertError) {
                    throw new Error(t('errors.exitingGeneration', { exitReason: t('errors.certValidationRequired') }));
                }
                // If the user choose to ignore cert errors, we need to re-validate
                LoggerHelper.logger.warn(t('prompts.validationMessages.warningCertificateValidationDisabled'));
                // Re-check if auth required as the cert error would have prevented this check earlier
                const validUrl = await connectValidator.validateUrl(serviceUrl, {
                    ignoreCertError,
                    forceReValidation: true
                });
                if (validUrl !== true) {
                    throw new Error(validUrl.toString()); // exit
                }
                if (!connectValidator.validity.authRequired && connectValidator.odataService) {
                    // Will log on CLI
                    const validService = await validateService(
                        serviceUrl,
                        {
                            odataService: connectValidator.odataService,
                            axiosConfig: connectValidator.axiosConfig
                        },
                        requiredVersion,
                        true
                    );
                    if (validService !== true) {
                        throw new Error(t('errors.exitingGeneration', { exitReason: validService.toString() }));
                    }
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
        when: () => (connectValidator.validity.reachable ? connectValidator.validity.authRequired === true : false),
        type: 'input',
        name: serviceUrlInternalPromptNames.username,
        message: t('prompts.serviceUsername.message'),
        guiOptions: {
            mandatory: true
        },
        validate: (user: string) => user?.length > 0
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
        when: () => (connectValidator.validity.reachable ? connectValidator.validity.authRequired === true : false),
        type: 'password',
        guiOptions: {
            applyDefaultWhenDirty: true,
            mandatory: true,
        },
        guiType: 'login',
        name: promptNames.serviceUrlPassword,
        message: t('prompts.servicePassword.message'),
        //guiType: 'login',
        mask: '*',
        validate: async (password: string, { username, serviceUrl, ignoreCertError, sapClient }: ServiceUrlAnswers) => {
            if (!serviceUrl || !username || !password) {
                return false;
            }
            const validAuth = await connectValidator.validateAuth(serviceUrl, username, password, {
                ignoreCertError,
                sapClient
            });
            if (validAuth === true && connectValidator.odataService) {
                return validateService(
                    serviceUrl,
                    {
                        odataService: connectValidator.odataService,
                        axiosConfig: connectValidator.axiosConfig
                    },
                    requiredVersion,
                    ignoreCertError
                );
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

    let questions: Question<ServiceUrlAnswers>[] = [
        getServiceUrlPrompt(connectValidator, requiredVersion),
        getIgnoreCertErrorsPrompt(connectValidator, requiredVersion)
    ];

    if (getHostEnvironment() === hostEnvironment.cli) {
        questions.push(getCliIgnoreCertValidatePrompt(connectValidator, requiredVersion));
    }
    questions.push(getUsernamePrompt(connectValidator), getPasswordPrompt(connectValidator, requiredVersion));

    // Add additional messages to prompts if specified in the prompt options
    let promptsOptToExtend: Record<string, CommonPromptOptions> = {};

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
