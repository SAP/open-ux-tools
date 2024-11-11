import { Severity } from '@sap-devx/yeoman-ui-types';
import type { Destination } from '@sap-ux/btp-utils';
import { isAppStudio, isPartialUrlDestination } from '@sap-ux/btp-utils';
import type { InputQuestion, ListQuestion } from '@sap-ux/inquirer-common';
import { searchChoices, withCondition } from '@sap-ux/inquirer-common';
import type { OdataVersion } from '@sap-ux/odata-service-writer';
import type { BackendSystem } from '@sap-ux/store';
import type { Answers, ListChoiceOptions, Question } from 'inquirer';
import { t } from '../../../../i18n';
import { hostEnvironment, promptNames, type OdataServicePromptOptions } from '../../../../types';
import { getHostEnvironment, PromptState } from '../../../../utils';
import type { ValidationResult } from '../../../connectionValidator';
import { ConnectionValidator } from '../../../connectionValidator';
import LoggerHelper from '../../../logger-helper';
import { BasicCredentialsPromptNames, getCredentialsPrompts } from '../credentials/questions';
import { getNewSystemQuestions } from '../new-system/questions';
import type { ServiceAnswer } from '../service-selection';
import { getSystemServiceQuestion } from '../service-selection/questions';
import { validateServiceUrl } from '../validators';
import { connectWithBackendSystem, connectWithDestination, createSystemChoices } from './prompt-helpers';

// New system choice value is a hard to guess string to avoid conflicts with existing system names or user named systems
// since it will be used as a new system value in the system selection prompt.
export const newSystemChoiceValue = '!@£*&937newSystem*X~qy^';
type NewSystemChoice = typeof newSystemChoiceValue;

const systemSelectionPromptNamespace = 'systemSelection';

const usernamePromptName = `${systemSelectionPromptNamespace}:${BasicCredentialsPromptNames.systemUsername}` as const;
const passwordPromptName = `${systemSelectionPromptNamespace}:${BasicCredentialsPromptNames.systemPassword}` as const;

const systemSelectionPromptNames = {
    systemSelectionCli: 'systemSelectionCli',
    destinationServicePath: 'destinationServicePath'
} as const;

export type SystemSelectionAnswerType = {
    type: 'destination' | 'backendSystem' | 'newSystemChoice' | 'cfAbapEnvService';
    system: Destination | BackendSystem | NewSystemChoice | 'cfAbapEnvService';
};

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
 * @param systemSelection
 * @param connectionValidator
 * @param requiredOdataVersion
 * @returns the validation result of the selected system connection attempt
 */
async function validateSystemSelection(
    systemSelection: SystemSelectionAnswerType,
    connectionValidator: ConnectionValidator,
    requiredOdataVersion?: OdataVersion
): Promise<ValidationResult> {
    PromptState.reset();
    if (systemSelection.type === 'newSystemChoice') {
        return true;
    }
    let connectValResult: ValidationResult = false;

    if (systemSelection.type === 'backendSystem') {
        connectValResult = await connectWithBackendSystem(
            systemSelection.system as BackendSystem,
            connectionValidator,
            requiredOdataVersion
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
 * @returns a list of questions for creating a new system configuration or selecting an existing stored system
 */
export async function getSystemSelectionQuestions(
    promptOptions?: OdataServicePromptOptions
): Promise<Question<SystemSelectionAnswers & ServiceAnswer>[]> {
    PromptState.reset();
    const connectValidator = new ConnectionValidator();

    const questions: Question<SystemSelectionAnswers & ServiceAnswer>[] = await getSystemConnectionQuestions(
        connectValidator,
        promptOptions
    );

    // Existing system (BackendSystem or Destination) selected,
    // In future, make the service prompt optional by wrapping in condition `[promptOptions?.serviceSelection?.hide]`
    questions.push(
        ...withCondition(
            getSystemServiceQuestion(connectValidator, systemSelectionPromptNamespace, promptOptions) as Question[],
            (answers: Answers) => (answers as SystemSelectionAnswers).systemSelection?.type !== 'newSystemChoice'
        )
    );

    // Create new system connection for storage only supported on non-App Studio environments
    if (!isAppStudio()) {
        questions.push(
            ...withCondition(
                getNewSystemQuestions(promptOptions) as Question[],
                (answers: Answers) => (answers as SystemSelectionAnswers).systemSelection?.type === 'newSystemChoice'
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
 * @param promptOptions
 * @returns a list of existing systems
 */
export async function getSystemConnectionQuestions(
    connectionValidator: ConnectionValidator,
    promptOptions?: OdataServicePromptOptions
): Promise<Question<SystemSelectionAnswers>[]> {
    const requiredOdataVersion = promptOptions?.serviceSelection?.requiredOdataVersion;
    const destinationFilters = promptOptions?.systemSelection?.destinationFilters;
    const systemChoices = await createSystemChoices(
        destinationFilters,
        promptOptions?.systemSelection?.includeCloudFoundryAbapEnvChoice
    );

    const questions: Question[] = [
        {
            type: promptOptions?.systemSelection?.useAutoComplete ? 'autocomplete' : 'list',
            name: promptNames.systemSelection,
            message: t('prompts.systemSelection.message'),
            source: (prevAnswers: unknown, input: string) => searchChoices(input, systemChoices as ListChoiceOptions[]),
            choices: systemChoices,
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
                    validateSystemSelection(selectedSystemAnswer, connectionValidator, requiredOdataVersion) ?? false
                );
            },
            additionalMessages: async (selectedSystem: SystemSelectionAnswerType) => {
                // Backend systems credentials may need to be updated
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
                breadcrumb: true
            },
            validate: async (servicePath: string, answers: SystemSelectionAnswers) => {
                if (!servicePath) {
                    return t('prompts.destinationServicePath.invalidServicePathWarning');
                }
                // Validate format of the service path, note this relies on the assumption that the destination is correctly configured with a valid URL
                const selectedDestination = answers?.[promptNames.systemSelection]?.system as Destination;
                const valUrlResult = validateServiceUrl(selectedDestination.Host, servicePath);
                if (valUrlResult !== true) {
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
    if (getHostEnvironment() === hostEnvironment.cli && !promptOptions?.systemSelection?.useAutoComplete) {
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
    questions.push(...getCredentialsPrompts(connectionValidator, systemSelectionPromptNamespace));

    return questions;
}
