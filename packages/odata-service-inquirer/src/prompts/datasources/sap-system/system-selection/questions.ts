import { Severity } from '@sap-devx/yeoman-ui-types';
import type { Destination } from '@sap-ux/btp-utils';
import { isAppStudio, isPartialUrlDestination } from '@sap-ux/btp-utils';
import type { InputQuestion, ListQuestion } from '@sap-ux/inquirer-common';
import { withCondition } from '@sap-ux/inquirer-common';
import type { OdataVersion } from '@sap-ux/odata-service-writer';
import type { BackendSystem } from '@sap-ux/store';
import type { Answers, Question } from 'inquirer';
import { t } from '../../../../i18n';
import { hostEnvironment, type OdataServicePromptOptions } from '../../../../types';
import { getHostEnvironment, PromptState } from '../../../../utils';
import type { ValidationResult } from '../../../connectionValidator';
import { ConnectionValidator } from '../../../connectionValidator';
import LoggerHelper from '../../../logger-helper';
import { BasicCredentialsPromptNames, getCredentialsPrompts } from '../credentials/questions';
import { getNewSystemQuestions } from '../new-system/questions';
import type { ServiceAnswer } from '../service-selection';
import { getSystemServiceQuestion } from '../service-selection/questions';
import { connectWithBackendSystem, connectWithDestination, createSystemChoices } from './prompt-helpers';
import { validateUrl } from '@sap-ux/project-input-validator';

// New system choice value is a hard to guess string to avoid conflicts with existing system names or user named systems
// since it will be used as a new system value in the system selection prompt.
export const newSystemChoiceValue = '!@£*&937newSystem*X~qy^' as const;
type NewSystemChoice = typeof newSystemChoiceValue;

const systemSelectionPromptNamespace = 'systemSelection';

const usernamePromptName = `${systemSelectionPromptNamespace}:${BasicCredentialsPromptNames.systemUsername}` as const;
const passwordPromptName = `${systemSelectionPromptNamespace}:${BasicCredentialsPromptNames.systemPassword}` as const;

const systemSelectionPromptNames = {
    systemSelection: 'systemSelection',
    systemSelectionCli: 'systemSelectionCli',
    destinationServicePath: 'destinationServicePath'
} as const;

export type SystemSelectionAnswerType = {
    type: 'destination' | 'backendSystem' | 'newSystemChoice';
    system: Destination | BackendSystem | NewSystemChoice;
};

interface SystemSelectionCredentialsAnswers {
    [usernamePromptName]?: string;
    [passwordPromptName]?: string;
}

export interface SystemSelectionAnswers extends SystemSelectionCredentialsAnswers {
    [systemSelectionPromptNames.systemSelection]?: SystemSelectionAnswerType;
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
): Promise<Question<SystemSelectionAnswers & ServiceAnswer>> {
    PromptState.reset();
    const connectValidator = new ConnectionValidator();

    const questions: Question<SystemSelectionAnswers & ServiceAnswer>[] = await getSystemConnectionQuestions(
        connectValidator,
        promptOptions
    );

    // If the selected system was in fact not a system or a full service url but a partial url destination we require furthur service path input we need to add additional service path prompt

    // Existing system (BackendSystem or Destination) selected, TODO: make the service prompt optional by wrapping in condition `[promptOptions?.serviceSelection?.hide]`
    questions.push(
        ...(withCondition(
            getSystemServiceQuestion(connectValidator, systemSelectionPromptNamespace, promptOptions) as Question[],
            (answers: Answers) => (answers as SystemSelectionAnswers).systemSelection?.type !== 'newSystemChoice'
        ) as Question[])
    );

    // Create new system selected
    questions.push(
        ...(withCondition(
            getNewSystemQuestions(promptOptions) as Question[],
            (answers: Answers) => (answers as SystemSelectionAnswers).systemSelection?.type === 'newSystemChoice'
        ) as Question[])
    );

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
    const systemChoices = await createSystemChoices(destinationFilters);

    const questions: Question[] = [
        {
            type: 'list',
            name: systemSelectionPromptNames.systemSelection,
            message: t('prompts.systemSelection.message'),
            // source: (preAnswers, input) => searchChoices(input, getSapSystemChoices(systems)),
            choices: systemChoices,
            validate: async (selectedSystem: SystemSelectionAnswerType): Promise<ValidationResult> => {
                if (!selectedSystem) {
                    return false;
                }
                return validateSystemSelection(selectedSystem, connectionValidator, requiredOdataVersion) ?? false;
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
        const servicePathPrompt = {
            when: (answers: SystemSelectionAnswers): boolean => {
                const systemSelection = answers?.[systemSelectionPromptNames.systemSelection];
                if (systemSelection?.type === 'destination') {
                    return isPartialUrlDestination(systemSelection.system as Destination);
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
                const selectedDestination = answers?.[systemSelectionPromptNames.systemSelection]
                    ?.system as Destination;
                const valUrlResult = validateUrl(selectedDestination.Host + servicePath);
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

    // Only for CLI use as `list` prompt validation does not run on CLI
    if (getHostEnvironment() === hostEnvironment.cli) {
        questions.push({
            when: async (answers: Answers): Promise<boolean> => {
                const systemSelection = answers?.[systemSelectionPromptNames.systemSelection];
                const connectValResult = await validateSystemSelection(
                    systemSelection,
                    connectionValidator,
                    requiredOdataVersion
                );
                // An issue occurred with the selected system, there is no need to continue on the CLI, log and exit
                if (connectValResult !== true) {
                    LoggerHelper.logger.error(connectValResult.toString);
                    throw new Error(connectValResult.toString());
                }
                return false;
            },
            name: `${systemSelectionPromptNames.systemSelectionCli}`
        } as Question);
    }
    const credentialsPrompts = getCredentialsPrompts(connectionValidator, systemSelectionPromptNamespace) as Question[];
    questions.push(...credentialsPrompts);

    return questions;
}
