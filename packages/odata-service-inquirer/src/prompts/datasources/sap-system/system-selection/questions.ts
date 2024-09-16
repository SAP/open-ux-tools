import { Answers, ListChoiceOptions, Question } from 'inquirer';
import { OdataServiceAnswers, OdataServicePromptOptions, OdataServiceQuestion, SapSystemType } from '../../../../types';
import { listDestinations, isAppStudio, Destination, ServiceInfo } from '@sap-ux/btp-utils';
import { ListQuestion, withCondition } from '@sap-ux/inquirer-common';
import { BackendSystem, BackendSystemKey, getService, SystemService } from '@sap-ux/store';
import LoggerHelper from '../../../logger-helper';
import { t } from '../../../../i18n';
import { convertODataVersionType, PromptState } from '../../../../utils';
import { ConnectionValidator, ValidationResult } from '../../../connectionValidator';
import { getSystemServiceQuestion } from '../service-selection/questions';
import { ServiceAnswer } from '../service-selection';
import { OdataVersion } from '@sap-ux/odata-service-writer';
import { getNewSystemQuestions } from '../new-system/questions';

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

export function getSystemDisplayName(system: BackendSystem): string {
    const userDisplayName = system.userDisplayName ? ` [${system.userDisplayName}]` : '';
    const systemTypeName =
        system.authenticationType === 'reentranceTicket' || system.authenticationType === 'oauth2'
            ? ` (${t('texts.systemTypeBTP')})`
            : '';

    return `${system.name}${systemTypeName}${userDisplayName}`;
}

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
 * Returns a list of available SapSystems
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
                connectValResult = await connectWithBackendSystem(systemSelection as BackendSystem, connectionValidator, requiredOdataVersion);
            }
            /* else if (destination) */
            return connectValResult ?? false;
        }
    } as ListQuestion<SystemSelectionAnswer>;
}
