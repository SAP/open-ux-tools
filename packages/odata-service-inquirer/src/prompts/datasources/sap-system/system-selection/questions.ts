import type { Destination, ServiceInfo } from '@sap-ux/btp-utils';
import { isAppStudio, listDestinations } from '@sap-ux/btp-utils';
import type { ListQuestion } from '@sap-ux/inquirer-common';
import { withCondition } from '@sap-ux/inquirer-common';
import type { OdataVersion } from '@sap-ux/odata-service-writer';
import type { BackendSystem } from '@sap-ux/store';
import { SystemService } from '@sap-ux/store';
import type { Answers, ListChoiceOptions, Question } from 'inquirer';
import { t } from '../../../../i18n';
import type {
    OdataServiceAnswers,
    OdataServicePromptOptions,
    OdataServiceQuestion,
    SapSystemType
} from '../../../../types';
import { convertODataVersionType, PromptState } from '../../../../utils';
import type { ValidationResult } from '../../../connectionValidator';
import { ConnectionValidator } from '../../../connectionValidator';
import LoggerHelper from '../../../logger-helper';
import { getNewSystemQuestions } from '../new-system/questions';
import type { ServiceAnswer } from '../service-selection';
import { getSystemServiceQuestion } from '../service-selection/questions';

// New system choice value is a hard to guess string to avoid conflicts with existing system names or user named systems
// since it will be used as a new system value in the system selection prompt.
export const newSystemChoiceValue = '!@£*&937newSystem*X~qy^';
type NewSystemChoice = typeof newSystemChoiceValue;

const systemSelectionPromptNamespace = 'systemSelection';

export const systemSelectionPromptNames = {
    systemSelection: 'systemSelection'
} as const;

type systemSelectionAnswerType = Destination | BackendSystem | NewSystemChoice;

export interface SystemSelectionAnswer extends OdataServiceAnswers {
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
 * Creates a list of choices for the system selection prompt using destinations or stored backend systems, depending on the environment.
 *
 * @returns a list of choices for the system selection prompt
 */
async function createSystemChoices(): Promise<ListChoiceOptions<SystemSelectionAnswer>[]> {
    let systemChoices: ListChoiceOptions<SystemSelectionAnswer>[] = [];
    let newSystemChoice: ListChoiceOptions<SystemSelectionAnswer>;

    // If this is BAS, return destinations, otherwise return stored backend systems
    if (isAppStudio()) {
        const destinations = await listDestinations();
        systemChoices = Object.values(destinations).map((destination) => {
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
        }
        // If the connection is successful, store the connected system
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

    const questions: Question<SystemSelectionAnswer & ServiceAnswer>[] = [
        await getSystemSelectionQuestion(connectValidator, promptOptions?.serviceSelection?.requiredOdataVersion)
    ];

    // Existing system (BackendSystem or Destination) selected
    questions.push(
        ...(withCondition(
            getSystemServiceQuestion(connectValidator, systemSelectionPromptNamespace, promptOptions) as Question[],
            (answers: Answers) => (answers as SystemSelectionAnswer).systemSelection !== newSystemChoiceValue
        ) as OdataServiceQuestion[])
    );

    // Create new system selected
    questions.push(
        ...(withCondition(
            getNewSystemQuestions(promptOptions) as Question[],
            (answers: Answers) => (answers as SystemSelectionAnswer).systemSelection === newSystemChoiceValue
        ) as OdataServiceQuestion[])
    );

    return questions;
}

/**
 * Returns a list of existing systems, either destinations or backend systems from persistent store, depending on the environment.
 *
 * @param connectionValidator A reference to the active connection validator, used to validate the service selection and retrieve service details.
 * @param requiredOdataVersion the required OData version for the service, this will be used to narrow the catalog service connections
 * @returns a list of existing systems
 */
export async function getSystemSelectionQuestion(
    connectionValidator: ConnectionValidator,
    requiredOdataVersion?: OdataVersion
): Promise<ListQuestion<SystemSelectionAnswer>> {
    const systemChoices = await createSystemChoices();

    return {
        type: 'list',
        name: systemSelectionPromptNames.systemSelection,
        message: t('prompts.systemSelection.message'),
        // source: (preAnswers, input) => searchChoices(input, getSapSystemChoices(systems)),
        choices: systemChoices,
        validate: async (systemSelection: systemSelectionAnswerType): Promise<ValidationResult> => {
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
            }
            /* else if (destination) */
            return connectValResult ?? false;
        }
    } as ListQuestion<SystemSelectionAnswer>;
}
