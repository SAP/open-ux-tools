import type { IMessageSeverity } from '@sap-devx/yeoman-ui-types';
import { Severity } from '@sap-devx/yeoman-ui-types';
import { hostEnvironment } from '@sap-ux/fiori-generator-shared';
import {
    extendWithOptions,
    type CommonPromptOptions,
    type ConfirmQuestion,
    type InputQuestion,
    type PasswordQuestion,
    type YUIQuestion
} from '@sap-ux/inquirer-common';
import type { OdataVersion } from '@sap-ux/odata-service-writer';
import type { ConvertedMetadata } from '@sap-ux/vocabularies-types';
import type { Question } from 'inquirer';
import { t } from '../../../i18n';
import type { OdataServiceAnswers, OdataServiceUrlPromptOptions } from '../../../types';
import { promptNames } from '../../../types';
import { PromptState, getPromptHostEnvironment } from '../../../utils';
import { ConnectionValidator } from '../../connectionValidator';
import LoggerHelper from '../../logger-helper';
import { showCollabDraftWarning } from '../service-helpers/service-helpers';
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
 * @param showCollabDraftWarn
 * @returns the service URL prompt
 */
function getServiceUrlPrompt(
    connectValidator: ConnectionValidator,
    requiredVersion?: OdataVersion,
    showCollabDraftWarn?: boolean
): InputQuestion<ServiceUrlAnswers> {
    let showAnnotationWarning = false;
    let convertedMetadata: ConvertedMetadata | undefined;
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
            showAnnotationWarning = false;
            const urlValidationState = await connectValidator.validateUrl(url);
            // Check if we have a cert error, the user will be prompted to ignore it later
            if (connectValidator.validity.canSkipCertError) {
                return true;
            }

            if (urlValidationState === true) {
                if (!connectValidator.validity.authRequired && connectValidator.odataService) {
                    showAnnotationWarning = false;
                    convertedMetadata = undefined;
                    const valResult = await validateService(
                        url,
                        {
                            odataService: connectValidator.odataService,
                            axiosConfig: connectValidator.axiosConfig
                        },
                        requiredVersion,
                        connectValidator.ignoreCertError
                    );
                    showAnnotationWarning = !!valResult.showAnnotationWarning;
                    convertedMetadata = valResult.convertedMetadata;
                    return valResult.validationResult;
                }
                return true;
            }
            return urlValidationState;
        },
        additionalMessages: () =>
            getAdditionalMessages(
                showAnnotationWarning,
                showCollabDraftWarn,
                convertedMetadata,
                connectValidator.ignoreCertError
            )
    } as InputQuestion<ServiceUrlAnswers>;
}

/**
 * Get an additional message (IMessageSeverity) based on the specified parameters.
 *
 * @param showAnnotationWarning true to show annotation warning, this will take precedence over collaborative draft warning
 * @param showCollabDraftWarn true to show collaborative draft warning, this will be shown only if `showAnnotationWarning` is false
 *  and determines that collaborative draft is not enabled
 * @param convertedMetadata provided to avoid reparsing the metadata
 * @param showNodeCertWarning
 * @returns
 */
function getAdditionalMessages(
    showAnnotationWarning?: boolean,
    showCollabDraftWarn?: boolean,
    convertedMetadata?: ConvertedMetadata,
    showNodeCertWarning?: boolean
): IMessageSeverity | void {
    if (showNodeCertWarning) {
        return {
            message: t('warnings.certErrorIgnoredByNodeSetting'),
            severity: Severity.warning
        };
    }
    if (showAnnotationWarning) {
        return {
            message: t('warnings.noAnnotations'),
            severity: Severity.warning
        };
    }
    if (convertedMetadata && showCollabDraftWarn && showCollabDraftWarning(convertedMetadata)) {
        return {
            message: t('warnings.collaborativeDraftMessage'),
            severity: Severity.warning
        };
    }
}

/**
 * Prompt to ignore cert errors.
 *
 * @param connectValidator Connection validator instance
 * @param requiredVersion The required OData version of the service
 * @param showCollabDraftWarn
 * @returns the ignore cert errors prompt
 */
function getIgnoreCertErrorsPrompt(
    connectValidator: ConnectionValidator,
    requiredVersion?: OdataVersion,
    showCollabDraftWarn?: boolean
): ConfirmQuestion<ServiceUrlAnswers> {
    let showAnnotationWarning = false;
    let convertedMetadata: ConvertedMetadata | undefined;

    return {
        when: ({ serviceUrl }: ServiceUrlAnswers) => {
            if (serviceUrl && connectValidator.validity.canSkipCertError && !connectValidator.ignoreCertError) {
                return true;
            }
            return false;
        },
        type: 'confirm',
        name: serviceUrlInternalPromptNames.ignoreCertError,
        message: t('prompts.ignoreCertErrors.message'),
        default: false,
        validate: async (ignoreCertError: boolean, { serviceUrl }: ServiceUrlAnswers) => {
            showAnnotationWarning = false;
            if (!serviceUrl) {
                return false;
            }

            if (ignoreCertError) {
                LoggerHelper.logger.warn(t('warnings.warningCertificateValidationDisabled'));
            }

            const validUrl = await connectValidator.validateUrl(serviceUrl, {
                ignoreCertError,
                forceReValidation: true
            });

            if (validUrl === true) {
                if (!connectValidator.validity.authRequired && connectValidator.odataService) {
                    const valResult = await validateService(
                        serviceUrl,
                        {
                            odataService: connectValidator.odataService,
                            axiosConfig: connectValidator.axiosConfig
                        },
                        requiredVersion,
                        ignoreCertError
                    );
                    showAnnotationWarning = !!valResult.showAnnotationWarning;
                    convertedMetadata = valResult.convertedMetadata;
                    return valResult.validationResult;
                }
                return true;
            }
            return validUrl;
        },
        additionalMessages: () => getAdditionalMessages(showAnnotationWarning, showCollabDraftWarn, convertedMetadata)
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
                LoggerHelper.logger.warn(t('warnings.warningCertificateValidationDisabled'));
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
                    const { validationResult } = await validateService(
                        serviceUrl,
                        {
                            odataService: connectValidator.odataService,
                            axiosConfig: connectValidator.axiosConfig
                        },
                        requiredVersion,
                        true
                    );
                    if (validationResult !== true) {
                        throw new Error(t('errors.exitingGeneration', { exitReason: validationResult.toString() }));
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
 * @param showCollabDraftWarn
 * @returns the password prompt
 */
function getPasswordPrompt(
    connectValidator: ConnectionValidator,
    requiredVersion?: OdataVersion,
    showCollabDraftWarn?: boolean
): PasswordQuestion<ServiceUrlAnswers> {
    let showAnnotationWarning = false;
    let convertedMetadata: ConvertedMetadata | undefined;
    return {
        when: () => (connectValidator.validity.reachable ? connectValidator.validity.authRequired === true : false),
        type: 'password',
        guiOptions: {
            applyDefaultWhenDirty: true,
            mandatory: true
        },
        guiType: 'login',
        name: promptNames.serviceUrlPassword,
        message: t('prompts.servicePassword.message'),
        mask: '*',
        validate: async (password: string, { username, serviceUrl, ignoreCertError, sapClient }: ServiceUrlAnswers) => {
            if (!serviceUrl || !username || !password) {
                return false;
            }
            const { valResult: validAuth } = await connectValidator.validateAuth(serviceUrl, username, password, {
                ignoreCertError,
                sapClient
            });
            if (validAuth === true && connectValidator.odataService) {
                showAnnotationWarning = false;
                convertedMetadata = undefined;
                const valResult = await validateService(
                    serviceUrl,
                    {
                        odataService: connectValidator.odataService,
                        axiosConfig: connectValidator.axiosConfig
                    },
                    requiredVersion,
                    ignoreCertError || connectValidator.ignoreCertError
                );
                showAnnotationWarning = !!valResult.showAnnotationWarning;
                convertedMetadata = valResult.convertedMetadata;
                return valResult.validationResult;
            }
            return validAuth;
        },
        additionalMessages: () => getAdditionalMessages(showAnnotationWarning, showCollabDraftWarn, convertedMetadata)
    } as PasswordQuestion<ServiceUrlAnswers>;
}

/**
 * Get the service URL questions.
 *
 * @param serviceUrlPromptOptions Options used to control prompt behaviour, see {@link OdataServiceUrlPromptOptions} for details
 * @returns the odata service URL questions
 */
export function getServiceUrlQuestions(
    serviceUrlPromptOptions: OdataServiceUrlPromptOptions = {}
): Question<OdataServiceAnswers>[] {
    // Connection validator maintains connection state and validity across multiple prompts
    const connectValidator = new ConnectionValidator();
    const requiredVersion = serviceUrlPromptOptions?.requiredOdataVersion;
    PromptState.reset();

    let questions: Question<ServiceUrlAnswers>[] = [
        getServiceUrlPrompt(connectValidator, requiredVersion, serviceUrlPromptOptions?.showCollaborativeDraftWarning),
        getIgnoreCertErrorsPrompt(
            connectValidator,
            requiredVersion,
            serviceUrlPromptOptions?.showCollaborativeDraftWarning
        )
    ];

    if (getPromptHostEnvironment() === hostEnvironment.cli) {
        questions.push(getCliIgnoreCertValidatePrompt(connectValidator, requiredVersion));
    }
    questions.push(
        getUsernamePrompt(connectValidator),
        getPasswordPrompt(connectValidator, requiredVersion, serviceUrlPromptOptions?.showCollaborativeDraftWarning)
    );

    // Add additional messages to prompts if specified in the prompt options.
    // Note that the additional messages specified for the service URL prompt will also be added to the ignore cert errors prompt and password prompt
    // this is to ensure that the messages are rendered in YUI regardless of authorization or cert prompts being displayed.
    let promptsOptToExtend: Record<string, CommonPromptOptions> = {};

    if (serviceUrlPromptOptions?.additionalMessages) {
        promptsOptToExtend = {
            [promptNames.serviceUrl]: serviceUrlPromptOptions,
            [promptNames.serviceUrlPassword]: {
                additionalMessages: serviceUrlPromptOptions?.additionalMessages
            },
            [serviceUrlInternalPromptNames.ignoreCertError]: {
                additionalMessages: serviceUrlPromptOptions?.additionalMessages
            }
        };
    }

    if (promptsOptToExtend) {
        questions = extendWithOptions(questions as YUIQuestion[], promptsOptToExtend, PromptState.odataService);
    }
    return questions;
}
