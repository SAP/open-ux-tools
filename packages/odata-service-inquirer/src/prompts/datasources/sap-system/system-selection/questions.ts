import { Severity } from '@sap-devx/yeoman-ui-types';
import type { Destination } from '@sap-ux/btp-utils';
import { isAppStudio, isPartialUrlDestination } from '@sap-ux/btp-utils';
import { hostEnvironment } from '@sap-ux/fiori-generator-shared';
import { type InputQuestion, type ListQuestion, searchChoices, withCondition } from '@sap-ux/inquirer-common';
import type { OdataVersion } from '@sap-ux/odata-service-writer';
import { BackendSystemKey, type BackendSystem } from '@sap-ux/store';
import type { Answers, ListChoiceOptions, Question } from 'inquirer';
import { t } from '../../../../i18n';
import { type ConnectedSystem, type OdataServicePromptOptions, promptNames } from '../../../../types';
import { getPromptHostEnvironment, PromptState } from '../../../../utils';
import { ConnectionValidator } from '../../../connectionValidator';
import LoggerHelper from '../../../logger-helper';
import type { ValidationResult } from '../../../types';
import { getCfAbapBASQuestions } from '../cf-abap/questions';
import { BasicCredentialsPromptNames, getCredentialsPrompts } from '../credentials/questions';
import { getNewSystemQuestions } from '../new-system/questions';
import type { ServiceAnswer } from '../service-selection';
import { getSystemServiceQuestion } from '../service-selection/questions';
import { validateServiceUrl } from '../validators';
import {
    type SystemSelectionAnswerType,
    connectWithBackendSystem,
    connectWithDestination,
    createSystemChoices,
    findDefaultSystemSelectionIndex
} from './prompt-helpers';

const systemSelectionPromptNamespace = 'systemSelection';

const usernamePromptName = `${systemSelectionPromptNamespace}:${BasicCredentialsPromptNames.systemUsername}` as const;
const passwordPromptName = `${systemSelectionPromptNamespace}:${BasicCredentialsPromptNames.systemPassword}` as const;

const systemSelectionPromptNames = {
    systemSelectionCli: 'systemSelectionCli',
    destinationServicePath: 'destinationServicePath'
} as const;

interface SystemSelectionCredentialsAnswers {
    [usernamePromptName]?: string;
    [passwordPromptName]?: string;
}

export interface SystemSelectionAnswers extends SystemSelectionCredentialsAnswers {
    [promptNames.systemSelection]?: SystemSelectionAnswerType;
}

/**
 * Validates the system selection, connecting to the selected system and validating the connection.
 *
 * @param systemSelection the selected system to validate
 * @param connectionValidator the active connection validator to use for the connection attempt
 * @param requiredOdataVersion the required OData version for the selected system, only the specified version will be used to request a service catalog
 * @param cachedConnectedSystem - if available passing an already connected system connection will prevent re-authentication for re-entrance ticket and service keys connection types
 * @returns the validation result of the selected system connection attempt
 */
async function validateSystemSelection(
    systemSelection: SystemSelectionAnswerType,
    connectionValidator: ConnectionValidator,
    requiredOdataVersion?: OdataVersion,
    cachedConnectedSystem?: ConnectedSystem
): Promise<ValidationResult> {
    PromptState.reset();
    if (systemSelection.type === 'newSystemChoice' || systemSelection.type === 'cfAbapEnvService') {
        // Reset the connection state
        connectionValidator.resetConnectionState(true);
        return true;
    }
    let connectValResult: ValidationResult = false;

    if (systemSelection.type === 'backendSystem') {
        const backendKey = BackendSystemKey.from(systemSelection.system as BackendSystem) as BackendSystemKey;
        connectValResult = await connectWithBackendSystem(
            backendKey,
            connectionValidator,
            requiredOdataVersion,
            cachedConnectedSystem
        );
    } else if (systemSelection.type === 'destination') {
        // Partial URL destinations will require additional service path prompt input, so we skip the connection validation here by returning true
        // The service URL connection will need to be validated by the service path prompt
        if (isPartialUrlDestination(systemSelection.system as Destination)) {
            // Reset the connection state as we are deferring the connection validation to the service path prompt, any existing connection state should be cleared
            // connectionValidator.resetConnectionState(true);
            return true;
        }
        connectValResult = await connectWithDestination(
            systemSelection.system as Destination,
            connectionValidator,
            requiredOdataVersion
        );
    }
    return connectValResult;
}

/**
 * Returns a list of questions for creating a new system configuration or selecting an existing stored system.
 *
 * @param promptOptions prompt options that may be used to customize the questions
 * @param connectedSystem - if available passing an already connected system connection will prevent re-authentication for re-entrance ticket and service keys connection types
 * @returns a list of questions for creating a new system configuration or selecting an existing stored system
 */
export async function getSystemSelectionQuestions(
    promptOptions?: OdataServicePromptOptions,
    connectedSystem?: ConnectedSystem
): Promise<Question<SystemSelectionAnswers & ServiceAnswer>[]> {
    PromptState.reset();
    const connectValidator = new ConnectionValidator();

    const questions: Question<SystemSelectionAnswers & ServiceAnswer>[] = await getSystemConnectionQuestions(
        connectValidator,
        promptOptions,
        connectedSystem
    );

    // Existing system (BackendSystem or Destination) selected,
    if (!promptOptions?.serviceSelection?.hide) {
        questions.push(
            ...withCondition(
                getSystemServiceQuestion(
                    connectValidator,
                    systemSelectionPromptNamespace,
                    promptOptions?.serviceSelection,
                    promptOptions?.valueHelpDownload?.hide === false
                ) as Question[],
                (answers: Answers) => (answers as SystemSelectionAnswers).systemSelection?.type !== 'newSystemChoice'
            )
        );
    }

    // Create new system connection for storage only supported on non-App Studio environments
    if (!isAppStudio()) {
        questions.push(
            ...withCondition(
                getNewSystemQuestions(promptOptions, connectedSystem) as Question[],
                (answers: Answers) => (answers as SystemSelectionAnswers).systemSelection?.type === 'newSystemChoice'
            )
        );
    } else {
        questions.push(
            ...withCondition(
                getCfAbapBASQuestions(promptOptions?.serviceSelection) as Question[],
                (answers: Answers) => (answers as SystemSelectionAnswers).systemSelection?.type === 'cfAbapEnvService'
            )
        );
    }

    return questions;
}

/**
 * Returns a list of existing systems, either destinations or backend systems from persistent store, depending on the environment.
 * Note that destinations are only available in BAS environment and must include the destination attribute `WebIDEEnabled` to be listed.
 * Additional destination attribute filters may be provided.
 *
 * @param connectionValidator A reference to the active connection validator, used to validate the service selection and retrieve service details.
 * @param promptOptions prompt options that may be used to customize the questions
 * @param cachedConnectedSystem - if available passing an already connected system connection will prevent re-authentication for re-entrance ticket and service keys connection types
 * @returns a list of existing systems
 */
export async function getSystemConnectionQuestions(
    connectionValidator: ConnectionValidator,
    promptOptions?: OdataServicePromptOptions,
    cachedConnectedSystem?: ConnectedSystem
): Promise<Question<SystemSelectionAnswers>[]> {
    const requiredOdataVersion = promptOptions?.serviceSelection?.requiredOdataVersion;
    const destinationFilters = promptOptions?.systemSelection?.destinationFilters;
    const systemChoices = await createSystemChoices(
        destinationFilters,
        promptOptions?.systemSelection?.includeCloudFoundryAbapEnvChoice
    );
    const defaultChoiceIndex = findDefaultSystemSelectionIndex(
        systemChoices,
        promptOptions?.systemSelection?.defaultChoice
    );

    const shouldOnlyShowDefaultChoice =
        promptOptions?.systemSelection?.onlyShowDefaultChoice && promptOptions?.systemSelection?.defaultChoice;

    const questions: Question[] = [
        {
            type: promptOptions?.systemSelection?.useAutoComplete ? 'autocomplete' : 'list',
            name: promptNames.systemSelection,
            message: t('prompts.systemSelection.message'),
            guiOptions: {
                breadcrumb: true,
                hint: t('prompts.systemSelection.hint')
            },
            source: (prevAnswers: unknown, input: string) => searchChoices(input, systemChoices as ListChoiceOptions[]),
            choices: shouldOnlyShowDefaultChoice ? [systemChoices[defaultChoiceIndex]] : systemChoices,
            default: shouldOnlyShowDefaultChoice ? 0 : defaultChoiceIndex,
            validate: async (
                selectedSystem: SystemSelectionAnswerType | ListChoiceOptions<SystemSelectionAnswerType>
            ): Promise<ValidationResult> => {
                if (!selectedSystem) {
                    return false;
                }
                let selectedSystemAnswer = selectedSystem as SystemSelectionAnswerType;
                // Autocomplete passes the entire choice object as the answer, so we need to extract the value
                if (promptOptions?.systemSelection?.useAutoComplete && (selectedSystem as ListChoiceOptions).value) {
                    selectedSystemAnswer = (selectedSystem as ListChoiceOptions).value;
                }
                return (
                    validateSystemSelection(
                        selectedSystemAnswer,
                        connectionValidator,
                        requiredOdataVersion,
                        cachedConnectedSystem
                    ) ?? false
                );
            },
            additionalMessages: async (selectedSystem: SystemSelectionAnswerType) => {
                if (
                    selectedSystem.type === 'backendSystem' &&
                    connectionValidator.systemAuthType === 'basic' &&
                    (await connectionValidator.isAuthRequired())
                ) {
                    return {
                        message: t('prompts.systemSelection.authenticationFailedUpdateCredentials'),
                        severity: Severity.information
                    };
                }
                if (connectionValidator.ignoreCertError) {
                    return {
                        message: t('warnings.certErrorIgnoredByNodeSetting'),
                        severity: Severity.warning
                    };
                }
            }
        } as ListQuestion<SystemSelectionAnswers>
    ];

    if (isAppStudio()) {
        // Additional service path prompt for partial URL destinations
        const servicePathPrompt = {
            when: (answers: SystemSelectionAnswers): boolean => {
                const selectedSystem = answers?.[promptNames.systemSelection];
                if (selectedSystem?.type === 'destination') {
                    return isPartialUrlDestination(selectedSystem.system as Destination);
                }
                return false;
            },
            type: 'input',
            name: systemSelectionPromptNames.destinationServicePath,
            message: t('prompts.destinationServicePath.message'),
            guiOptions: {
                hint: t('prompts.destinationServicePath.hint'),
                mandatory: true,
                breadcrumb: true,
                applyDefaultWhenDirty: true
            },
            default: '',
            validate: async (servicePath: string, answers: SystemSelectionAnswers) => {
                // @sap-ux/btp-utils getDestinationUrlForAppStudio() enforces a path length of > 1, even though it could be a valid path
                // Double slashes are not allowed at the start of the path as they break URL construction
                if (!servicePath || servicePath.trim().length < 2 || servicePath.startsWith('//')) {
                    connectionValidator.resetConnectionState(true);
                    return t('prompts.destinationServicePath.invalidServicePathWarning');
                }
                // Validate format of the service path, note this relies on the assumption that the destination is correctly configured with a valid URL
                const selectedDestination = answers?.[promptNames.systemSelection]?.system as Destination;
                const valUrlResult = validateServiceUrl(selectedDestination.Host, servicePath);
                if (valUrlResult !== true) {
                    connectionValidator.resetConnectionState(true);
                    return valUrlResult;
                }

                const connectValResult = await connectWithDestination(
                    selectedDestination,
                    connectionValidator,
                    requiredOdataVersion,
                    servicePath
                );
                return connectValResult;
            }
        } as InputQuestion<SystemSelectionAnswers>;
        questions.push(servicePathPrompt);
    }

    // Only for CLI use as `list` prompt validation does not run on CLI unless autocomplete plugin is used
    if (getPromptHostEnvironment() === hostEnvironment.cli && !promptOptions?.systemSelection?.useAutoComplete) {
        questions.push({
            when: async (answers: Answers): Promise<boolean> => {
                const selectedSystem = answers?.[promptNames.systemSelection];
                if (!selectedSystem) {
                    return false;
                }
                const connectValResult = await validateSystemSelection(
                    selectedSystem,
                    connectionValidator,
                    requiredOdataVersion
                );
                // An issue occurred with the selected system, there is no need to continue on the CLI, log and exit
                // Note that for connection authentication errors, the result will be true, the user will be prompted to update their credentials in the next prompt
                if (connectValResult !== true) {
                    LoggerHelper.logger.error(connectValResult.toString);
                    throw new Error(connectValResult.toString());
                }
                return false;
            },
            name: `${systemSelectionPromptNames.systemSelectionCli}`
        });
    }
    questions.push(
        ...getCredentialsPrompts(connectionValidator, systemSelectionPromptNamespace, undefined, requiredOdataVersion)
    );

    return questions;
}
