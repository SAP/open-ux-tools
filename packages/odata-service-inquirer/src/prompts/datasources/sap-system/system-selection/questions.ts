import { Severity } from '@sap-devx/yeoman-ui-types';
import type { Destination } from '@sap-ux/btp-utils';
import { isAppStudio, isPartialUrlDestination } from '@sap-ux/btp-utils';
import { hostEnvironment } from '@sap-ux/fiori-generator-shared';
import {
    type ChoiceOptions,
    type InputQuestion,
    type ListQuestion,
    type SearchQuestion,
    searchChoices,
    withCondition,
    type YUIQuestion
} from '@sap-ux/inquirer-common';
import type { OdataVersion } from '@sap-ux/odata-service-writer';
import { BackendSystemKey, type BackendSystem } from '@sap-ux/store';
import type { Answers, Question } from 'inquirer';
import { t } from '../../../../i18n.js';
import { type ConnectedSystem, type OdataServicePromptOptions, promptNames } from '../../../../types.js';
import { getPromptHostEnvironment, PromptState } from '../../../../utils/index.js';
import { ConnectionValidator } from '../../../connectionValidator.js';
import LoggerHelper from '../../../logger-helper.js';
import type { ValidationResult } from '../../../types.js';
import { getCfAbapBASQuestions } from '../cf-abap/questions.js';
import { BasicCredentialsPromptNames, getCredentialsPrompts } from '../credentials/questions.js';
import { getNewSystemQuestions } from '../new-system/questions.js';
import type { ServiceAnswer } from '../service-selection/index.js';
import { getSystemServiceQuestion } from '../service-selection/questions.js';
import { validateServiceUrl } from '../validators.js';
import {
    type SystemSelectionAnswerType,
    connectWithBackendSystem,
    connectWithDestination,
    createSystemChoices,
    findDefaultSystemSelectionIndex
} from './prompt-helpers.js';

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
 * @param cachedConnectedSystem if available passing an already connected system connection will prevent re-authentication for re-entrance ticket and service keys connection types
 * @param connectPath if specified will be used as the connection endpoint instead of service catalogs
 * @returns the validation result of the selected system connection attempt
 */
async function validateSystemSelection(
    systemSelection: SystemSelectionAnswerType,
    connectionValidator: ConnectionValidator,
    requiredOdataVersion?: OdataVersion,
    cachedConnectedSystem?: ConnectedSystem,
    connectPath?: string
): Promise<ValidationResult> {
    PromptState.reset();
    if (systemSelection.type === 'newSystemChoice' || systemSelection.type === 'cfAbapEnvService') {
        // Reset the connection state
        connectionValidator.resetConnectionState(true);
        return true;
    }
    let connectValResult: ValidationResult = false;

    if (systemSelection.type === 'backendSystem') {
        if ((systemSelection.system as BackendSystem).connectionType === 'odata_service') {
            connectPath = (systemSelection.system as BackendSystem).url;
        }
        const backendKey = BackendSystemKey.from(systemSelection.system as BackendSystem) as BackendSystemKey;
        connectValResult = await connectWithBackendSystem(
            backendKey,
            connectionValidator,
            requiredOdataVersion,
            cachedConnectedSystem,
            connectPath
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
            requiredOdataVersion,
            connectPath
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
                    promptOptions?.valueHelpDownload?.hide
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
                getCfAbapBASQuestions(promptOptions) as Question[],
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
        promptOptions?.systemSelection?.includeCloudFoundryAbapEnvChoice,
        promptOptions?.systemSelection?.hideNewSystem,
        promptOptions?.systemSelection?.backendSystemFilter
    );
    let defaultChoiceIndex = findDefaultSystemSelectionIndex(
        systemChoices,
        promptOptions?.systemSelection?.defaultChoice
    );
    // Alternative connection path, will override default authentication path (catalog endpoints)
    let connectPath = promptOptions?.systemSelection?.connectPath;

    const shouldOnlyShowDefaultChoice =
        promptOptions?.systemSelection?.onlyShowDefaultChoice && promptOptions?.systemSelection?.defaultChoice;

    const effectiveSystemChoices = shouldOnlyShowDefaultChoice ? [systemChoices[defaultChoiceIndex]] : systemChoices;

    // inquirer 13's `select`/`search` default is a choice value (not the inquirer 8 list index); the
    // former index-returning default logic is retained but mapped to the choice value at that index.
    const getSystemSelectionDefault = (): SystemSelectionAnswerType | undefined => {
        let defaultIndex: number;
        if (shouldOnlyShowDefaultChoice) {
            defaultIndex = 0;
        } else {
            defaultChoiceIndex = findDefaultSystemSelectionIndex(
                systemChoices,
                promptOptions?.systemSelection?.defaultChoice
            ); // Recalc to allow default choice to be bound to ref from another prompt

            // Regardless of finding a match the provided connect path is applied
            if (typeof promptOptions?.systemSelection?.connectPath === 'object') {
                connectPath = promptOptions?.systemSelection.connectPath;
            }
            defaultIndex = defaultChoiceIndex;
        }
        return effectiveSystemChoices[defaultIndex]?.value;
    };

    const systemSelectionBase = {
        name: promptNames.systemSelection,
        message: t('prompts.systemSelection.message'),
        guiOptions: {
            breadcrumb: true,
            hint: t('prompts.systemSelection.hint')
        },
        default: getSystemSelectionDefault,
        validate: async (selectedSystem?: SystemSelectionAnswerType): Promise<ValidationResult> => {
            if (!selectedSystem) {
                return false;
            }
            return (
                validateSystemSelection(
                    selectedSystem,
                    connectionValidator,
                    requiredOdataVersion,
                    cachedConnectedSystem,
                    connectPath?.value
                ) ?? false
            );
        },
        additionalMessages: async (selectedSystem?: unknown) => {
            const system = selectedSystem as SystemSelectionAnswerType;
            if (
                system.type === 'backendSystem' &&
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
    };

    const systemSelectionQuestion: YUIQuestion<SystemSelectionAnswers> = promptOptions?.systemSelection?.useAutoComplete
        ? ({
              ...systemSelectionBase,
              type: 'search',
              source: (term: string | undefined): ChoiceOptions[] =>
                  searchChoices(term ?? '', effectiveSystemChoices as ChoiceOptions[])
          } as SearchQuestion<SystemSelectionAnswers>)
        : ({
              ...systemSelectionBase,
              type: 'select',
              choices: effectiveSystemChoices
          } as ListQuestion<SystemSelectionAnswers>);

    const questions: Question[] = [systemSelectionQuestion as unknown as Question];

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
        } as unknown as InputQuestion<SystemSelectionAnswers>;
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
                    requiredOdataVersion,
                    undefined,
                    connectPath?.value
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
        } as Question);
    }
    questions.push(
        ...getCredentialsPrompts(connectionValidator, systemSelectionPromptNamespace, undefined, requiredOdataVersion)
    );

    return questions;
}
