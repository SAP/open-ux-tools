import { Severity } from '@sap-devx/yeoman-ui-types';
import type { Destination } from '@sap-ux/btp-utils';
import { isAppStudio, isFullUrlDestination, isPartialUrlDestination, listDestinations } from '@sap-ux/btp-utils';
import type { ListQuestion } from '@sap-ux/inquirer-common';
import { withCondition } from '@sap-ux/inquirer-common';
import type { OdataVersion } from '@sap-ux/odata-service-writer';
import type { BackendSystem } from '@sap-ux/store';
import { SystemService } from '@sap-ux/store';
import type { Answers, ListChoiceOptions, Question } from 'inquirer';
import { t } from '../../../../i18n';
import {
    hostEnvironment,
    type DestinationFilters,
    type OdataServicePromptOptions,
    type SapSystemType
} from '../../../../types';
import { getHostEnvironment, PromptState } from '../../../../utils';
import type { ValidationResult } from '../../../connectionValidator';
import { ConnectionValidator } from '../../../connectionValidator';
import LoggerHelper from '../../../logger-helper';
import { BasicCredentialsPromptNames, getCredentialsPrompts } from '../credentials/questions';
import { getNewSystemQuestions } from '../new-system/questions';
import type { ServiceAnswer } from '../service-selection';
import { getSystemServiceQuestion } from '../service-selection/questions';
import {
    connectWithBackendSystem,
    connectWithDestination,
    getSystemDisplayName,
    isAbapODataDestination
} from './prompt-helpers';

// New system choice value is a hard to guess string to avoid conflicts with existing system names or user named systems
// since it will be used as a new system value in the system selection prompt.
export const newSystemChoiceValue = '!@£*&937newSystem*X~qy^';
type NewSystemChoice = typeof newSystemChoiceValue;

const systemSelectionPromptNamespace = 'systemSelection';

const usernamePromptName = `${systemSelectionPromptNamespace}:${BasicCredentialsPromptNames.systemUsername}` as const;
const passwordPromptName = `${systemSelectionPromptNamespace}:${BasicCredentialsPromptNames.systemPassword}` as const;

const systemSelectionPromptNames = {
    systemSelection: 'systemSelection',
    systemSelectionCli: 'systemSelectionCli'
} as const;

export type SystemSelectionAnswerType = {
    type: 'destination' | 'backendSystem' | 'newSystemChoice';
    system: Destination | BackendSystem | NewSystemChoice;
};

interface SystemSelectionCredentialsAnswers {
    [usernamePromptName]?: string;
    [passwordPromptName]?: string;
}

export interface SystemSelectionAnswer extends SystemSelectionCredentialsAnswers {
    [systemSelectionPromptNames.systemSelection]?: SystemSelectionAnswerType;
}

/**
 * Matches the destination against the provided filters. Returns true if the destination matches any filters, false otherwise.
 *
 * @param destination
 * @param filters
 * @returns true if the destination matches any filters, false otherwise
 */
function matchesFilters(destination: Destination, filters?: DestinationFilters): boolean {
    if (!filters) {
        return true;
    }
    if (filters.odata_abap && isAbapODataDestination(destination)) {
        return true;
    }

    if (filters.full_service_url && isFullUrlDestination(destination)) {
        return true;
    }

    if (filters.partial_service_url && isPartialUrlDestination(destination)) {
        return true;
    }
    LoggerHelper.logger.debug(
        `Destination: ${
            destination.Name
        } does not match any filters and will be excluded as a prompt choice. Destination configuration: ${JSON.stringify(
            destination
        )}`
    );
    return false;
}

/**
 * Creates a list of choices for the system selection prompt using destinations or stored backend systems, depending on the environment.
 *
 * @param destinationFilters
 * @returns a list of choices for the system selection prompt
 */
async function createSystemChoices(
    destinationFilters?: DestinationFilters
): Promise<ListChoiceOptions<SystemSelectionAnswer>[]> {
    let systemChoices: ListChoiceOptions<SystemSelectionAnswer>[] = [];
    let newSystemChoice: ListChoiceOptions<SystemSelectionAnswer>;

    // If this is BAS, return destinations, otherwise return stored backend systems
    if (isAppStudio()) {
        const destinations = await listDestinations();
        systemChoices = Object.values(destinations)
            .filter((destination) => {
                return matchesFilters(destination, destinationFilters);
            })
            .map((destination) => {
                return {
                    name: destination.Name,
                    value: {
                        type: 'destination',
                        system: destination
                    } as SystemSelectionAnswerType
                };
            });
        newSystemChoice = { name: t('prompts.newSystemType.choiceAbapOnBtp'), value: 'abapOnBtp' as SapSystemType }; // TODO: add new system choice for destinations
    } else {
        const backendSystems = await new SystemService(LoggerHelper.logger).getAll();
        systemChoices = backendSystems.map((system) => {
            return {
                name: getSystemDisplayName(system),
                value: {
                    system,
                    type: 'backendSystem'
                } as SystemSelectionAnswerType
            };
        });
        newSystemChoice = {
            name: t('prompts.systemSelection.newSystemChoiceLabel'),
            value: { system: newSystemChoiceValue, type: 'newSystemChoice' }
        };
    }
    systemChoices.sort(({ name: nameA }, { name: nameB }) =>
        nameA!.localeCompare(nameB!, undefined, { numeric: true, caseFirst: 'lower' })
    );
    systemChoices.unshift(newSystemChoice);
    return systemChoices;
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
): Promise<Question<SystemSelectionAnswer & ServiceAnswer>> {
    PromptState.reset();
    const connectValidator = new ConnectionValidator();

    const questions: Question<SystemSelectionAnswer & ServiceAnswer>[] = await getSystemConnectionQuestions(
        connectValidator,
        promptOptions
    );

    // If the selected system was in fact not a system but a partial url destination and requires furthur service path input we need to add additional service path prompt

    // Existing system (BackendSystem or Destination) selected, TODO: make the service prompt optional
    questions.push(
        ...(withCondition(
            getSystemServiceQuestion(connectValidator, systemSelectionPromptNamespace, promptOptions) as Question[],
            (answers: Answers) => (answers as SystemSelectionAnswer).systemSelection?.type !== 'newSystemChoice'
        ) as Question[])
    );

    // Create new system selected
    questions.push(
        ...(withCondition(
            getNewSystemQuestions(promptOptions) as Question[],
            (answers: Answers) => (answers as SystemSelectionAnswer).systemSelection?.type === 'newSystemChoice'
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
): Promise<Question<SystemSelectionAnswer>[]> {
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
            validate: async (systemSelection: SystemSelectionAnswerType): Promise<ValidationResult> => {
                if (!systemSelection) {
                    return false;
                }
                return validateSystemSelection(systemSelection, connectionValidator, requiredOdataVersion) ?? false;
            },
            additionalMessages: async () => {
                if (connectionValidator.systemAuthType === 'basic' && (await connectionValidator.isAuthRequired())) {
                    return {
                        message: t('prompts.systemSelection.authenticationFailedUpdateCredentials'),
                        severity: Severity.information
                    };
                }
            }
        } as ListQuestion<SystemSelectionAnswer>
    ];

    /**
     * questions.push(
        ...withCondition(
            getAbapOnPremQuestions(promptOptions) as Question[],
            (answers: Answers) => (answers as NewSystemAnswers).newSystemType === 'abapOnPrem'
        )
    );
     */
    // TODO: we need to set the Prompt State connected system once validated credentials for destinaton?
    // Use withCondition and add :
    /**
     * // If the connection is successful, we will return the connected system from the inquirer
    if (connectionValidator.validity.authorized === true && connectionValidator.serviceProvider) {
        PromptState.odataService.connectedSystem = {
            serviceProvider: connectionValidator.serviceProvider,
            destination
        };
    }
     */
    const credentialsPrompts = getCredentialsPrompts(connectionValidator, systemSelectionPromptNamespace) as Question[];
    questions.push(...credentialsPrompts);

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
    return questions;
}
