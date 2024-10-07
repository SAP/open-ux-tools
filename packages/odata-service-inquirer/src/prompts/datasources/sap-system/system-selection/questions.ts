import { Severity } from '@sap-devx/yeoman-ui-types';
import type { Destination, ServiceInfo } from '@sap-ux/btp-utils';
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
import { convertODataVersionType, getHostEnvironment, PromptState } from '../../../../utils';
import type { ValidationResult } from '../../../connectionValidator';
import { ConnectionValidator } from '../../../connectionValidator';
import LoggerHelper from '../../../logger-helper';
import { BasicCredentialsPromptNames, getCredentialsPrompts } from '../abap-on-prem/questions';
import { getNewSystemQuestions } from '../new-system/questions';
import type { ServiceAnswer } from '../service-selection';
import { getSystemServiceQuestion } from '../service-selection/questions';
import { isAbapODataDestination } from './destination-helpers';

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

type systemSelectionAnswerType = Destination | BackendSystem | NewSystemChoice;

interface SystemSelectionCredentialsAnswers {
    [usernamePromptName]?: string;
    [passwordPromptName]?: string;
}

export interface SystemSelectionAnswer extends SystemSelectionCredentialsAnswers {
    [systemSelectionPromptNames.systemSelection]?: Destination | BackendSystem | NewSystemChoice;
}

/**
 * Creates and returns a display name for the system, appending the system type and user display name if available.
 *
 * @param system the backend system to create a display name for
 * @returns the display name for the system
 */
export function getSystemDisplayName(system: BackendSystem): string {
    const userDisplayName = system.userDisplayName ? ` [${system.userDisplayName}]` : '';
    const systemTypeName =
        system.authenticationType === 'reentranceTicket' || system.authenticationType === 'oauth2'
            ? ` (${t('texts.systemTypeBTP')})`
            : '';

    return `${system.name}${systemTypeName}${userDisplayName}`;
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
                    value: destination
                };
            });
        newSystemChoice = { name: t('prompts.newSystemType.choiceAbapOnBtp'), value: 'abapOnBtp' as SapSystemType };
    } else {
        const backendSystems = await new SystemService(LoggerHelper.logger).getAll();
        systemChoices = backendSystems.map((system) => {
            return {
                name: getSystemDisplayName(system),
                value: system
            };
        });
        newSystemChoice = { name: t('prompts.systemSelection.newSystemChoiceLabel'), value: newSystemChoiceValue };
    }
    systemChoices.sort(({ name: nameA }, { name: nameB }) =>
        nameA!.localeCompare(nameB!, undefined, { numeric: true, caseFirst: 'lower' })
    );
    systemChoices.unshift(newSystemChoice);
    return systemChoices;
}

/**
 * Connects to the specified backend system and validates the connection.
 * Note this will return true in the case of basic auth validation failure to defer validation to the credentials prompt.
 *
 * @param backendSystem the backend system to connect to
 * @param connectionValidator the connection validator to use for the connection
 * @param requiredOdataVersion the required OData version for the service, this will be used to narrow the catalog service connections
 * @returns the validation result of the backend system connection
 */
async function connectWithBackendSystem(
    backendSystem: BackendSystem,
    connectionValidator: ConnectionValidator,
    requiredOdataVersion?: OdataVersion
): Promise<ValidationResult> {
    // Create a new connection with the selected system
    let connectValResult: ValidationResult = false;
    if (!isAppStudio() && backendSystem) {
        // Assumption: non-BAS systems are BackendSystems
        if (backendSystem.authenticationType === 'reentranceTicket') {
            connectValResult = await connectionValidator.validateUrl(backendSystem.url, {
                isSystem: true,
                odataVersion: convertODataVersionType(requiredOdataVersion),
                systemAuthType: 'reentranceTicket'
            });
        } else if (backendSystem.serviceKeys) {
            connectValResult = await connectionValidator.validateServiceInfo(backendSystem.serviceKeys as ServiceInfo);
        } else if (
            (backendSystem.authenticationType === 'basic' || !backendSystem.authenticationType) &&
            backendSystem.username &&
            backendSystem.password
        ) {
            connectValResult = await connectionValidator.validateAuth(
                backendSystem.url,
                backendSystem.username,
                backendSystem.password,
                {
                    isSystem: true,
                    odataVersion: convertODataVersionType(requiredOdataVersion),
                    sapClient: backendSystem.client
                }
            );
            // If authentication failed with existing credentials the user will be prompted to enter new credentials.
            // Returning true will effectively defer validation to the credentials prompt.
            if (connectValResult !== true) {
                return true;
            }
        }
        // If the connection is successful, we will return the connected system from the inquirer
        if (connectValResult === true && connectionValidator.serviceProvider) {
            PromptState.odataService.connectedSystem = {
                serviceProvider: connectionValidator.serviceProvider,
                backendSystem
            };
        }
    }
    return connectValResult;
}

/**
 * Connects to the specified destination and validates the connection.
 *
 * @param destination the destination specifying the connection details
 * @param connectionValidator the connection validator to use for the connection
 * @param requiredOdataVersion the required OData version for the service, this will be used to narrow the catalog service connections
 * @returns the validation result of the destination connection attempt
 */
async function connectWithDestination(
    destination: Destination,
    connectionValidator: ConnectionValidator,
    requiredOdataVersion?: OdataVersion
): Promise<ValidationResult> {
    const connectValResult = await connectionValidator.validateDestination(
        destination,
        convertODataVersionType(requiredOdataVersion)
    );

    // If the connection is successful, we will return the connected system from the inquirer
    if (connectValResult === true && connectionValidator.serviceProvider) {
        PromptState.odataService.connectedSystem = {
            serviceProvider: connectionValidator.serviceProvider,
            destination
        };
    }

    return connectValResult;
}

/**
 * Validates the system selection, connecting to the selected system and validating the connection.
 *
 * @param systemSelection
 * @param connectionValidator
 * @param backendSystemRef
 * @param backendSystemRef.backendSystem
 * @param requiredOdataVersion
 * @returns the validation result of the selected system connection attempt
 */
async function validateSystemSelection(
    systemSelection: systemSelectionAnswerType,
    connectionValidator: ConnectionValidator,
    backendSystemRef?: { backendSystem: BackendSystem | undefined },
    requiredOdataVersion?: OdataVersion
): Promise<ValidationResult> {
    if (systemSelection === newSystemChoiceValue) {
        return true;
    }
    let connectValResult: ValidationResult = false;
    // Assumption: non-BAS systems are BackendSystems
    if (systemSelection && !isAppStudio()) {
        connectValResult = await connectWithBackendSystem(
            systemSelection as BackendSystem,
            connectionValidator,
            requiredOdataVersion
        );
        if (backendSystemRef) {
            backendSystemRef.backendSystem = systemSelection as BackendSystem;
        }
    } else if (systemSelection && isAppStudio()) {
        // Assumption: BAS systems are Destinations
        connectValResult = await connectWithDestination(
            systemSelection as Destination,
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

    // Existing system (BackendSystem or Destination) selected, todo: make the service prompt optional
    questions.push(
        ...(withCondition(
            getSystemServiceQuestion(connectValidator, systemSelectionPromptNamespace, promptOptions) as Question[],
            (answers: Answers) => (answers as SystemSelectionAnswer).systemSelection !== newSystemChoiceValue
        ) as Question[])
    );

    // Create new system selected
    questions.push(
        ...(withCondition(
            getNewSystemQuestions(promptOptions) as Question[],
            (answers: Answers) => (answers as SystemSelectionAnswer).systemSelection === newSystemChoiceValue
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
    const backendSystemRef: { backendSystem: BackendSystem | undefined } = { backendSystem: undefined };

    const questions: Question[] = [
        {
            type: 'list',
            name: systemSelectionPromptNames.systemSelection,
            message: t('prompts.systemSelection.message'),
            // source: (preAnswers, input) => searchChoices(input, getSapSystemChoices(systems)),
            choices: systemChoices,
            validate: async (systemSelection: systemSelectionAnswerType): Promise<ValidationResult> => {
                return (
                    validateSystemSelection(
                        systemSelection,
                        connectionValidator,
                        backendSystemRef,
                        requiredOdataVersion
                    ) ?? false
                );
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
    const credentialsPrompts = getCredentialsPrompts(
        connectionValidator,
        systemSelectionPromptNamespace,
        undefined,
        backendSystemRef
    ) as Question[];
    questions.push(...credentialsPrompts);

    // Only for CLI use as `list` prompt validation does not run on CLI
    if (getHostEnvironment() === hostEnvironment.cli) {
        questions.push({
            when: async (answers: Answers): Promise<boolean> => {
                const systemSelection = answers?.[systemSelectionPromptNames.systemSelection];
                const connectValResult = await validateSystemSelection(
                    systemSelection,
                    connectionValidator,
                    backendSystemRef,
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
    // ** TODO ** CLI prompt for system selection
}
