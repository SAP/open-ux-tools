import { withCondition } from '@sap-ux/inquirer-common';
import type { OdataVersion } from '@sap-ux/odata-service-writer';
import { validateClient } from '@sap-ux/project-input-validator';
import type { BackendSystem } from '@sap-ux/store';
import type { Answers, InputQuestion, PasswordQuestion, Question } from 'inquirer';
import { t } from '../../../../i18n';
import type {
    OdataServiceAnswers,
    OdataServicePromptOptions,
    ServiceSelectionPromptOptions,
    SystemNamePromptOptions
} from '../../../../types';
import { PromptState } from '../../../../utils';
import { ConnectionValidator } from '../../../connectionValidator';
import { getSystemUrlQuestion, getUserSystemNameQuestion } from '../new-system/questions';
import { newSystemPromptNames } from '../new-system/types';
import { type ServiceAnswer, getSystemServiceQuestion } from '../service-selection';

/** MOVE */
export enum BasicCredentialsPromptNames {
    systemUsername = 'systemUsername',
    systemPassword = 'systemPassword'
}

const abapOnPremPromptNamespace = 'abapOnPrem';
const systemUrlPromptName = `${abapOnPremPromptNamespace}:${newSystemPromptNames.newSystemUrl}` as const;
const usernamePromptName = `${abapOnPremPromptNamespace}:${BasicCredentialsPromptNames.systemUsername}` as const;
const passwordPromptName = `${abapOnPremPromptNamespace}:${BasicCredentialsPromptNames.systemPassword}` as const;

export enum abapOnPremPromptNames {
    sapClient = 'sapClient'
}

interface AbabpOnPremCredentialsAnswers {
    [usernamePromptName]?: string;
    [passwordPromptName]?: string;
}

export interface AbapOnPremAnswers extends Partial<OdataServiceAnswers>, AbabpOnPremCredentialsAnswers {
    [systemUrlPromptName]?: string;
}

/**
 * Get the Abap on-premise datasource questions.
 *
 * @param promptOptions options for prompts. Applicable options are: {@link ServiceSelectionPromptOptions}, {@link SystemNamePromptOptions}
 * @returns property questions for the Abap on-premise datasource
 */
export function getAbapOnPremQuestions(
    promptOptions?: OdataServicePromptOptions
): Question<AbapOnPremAnswers & ServiceAnswer>[] {
    PromptState.reset();
    const connectValidator = new ConnectionValidator();
    // Prompt options
    const requiredOdataVersion = promptOptions?.serviceSelection?.requiredOdataVersion;

    const questions: Question<AbapOnPremAnswers & ServiceAnswer>[] = getAbapOnPremSystemQuestions(
        promptOptions?.userSystemName,
        connectValidator,
        requiredOdataVersion
    );

    questions.push(...getSystemServiceQuestion(connectValidator, abapOnPremPromptNamespace, promptOptions));

    return questions;
}

/**
 * Gets the Abap on-premise system questions.
 *
 * @param systemNamePromptOptions options for the system name prompt see {@link SystemNamePromptOptions}
 * @param connectionValidator reference to the existing connection validator, a new one will be created otherwise
 * @param requiredOdataVersion the required OData version for the service, this will be used to narrow the catalog service connections
 * @returns the Abap on-premise system questions
 */
export function getAbapOnPremSystemQuestions(
    systemNamePromptOptions?: SystemNamePromptOptions,
    connectionValidator?: ConnectionValidator,
    requiredOdataVersion?: OdataVersion
): Question<AbapOnPremAnswers>[] {
    const connectValidator = connectionValidator ?? new ConnectionValidator();
    // Object reference to access dynamic sapClient value in prompts where the previous answers are not available.
    // This allows re-usability of the credentials prompts where a client prompt was not used (client was loaded from store).
    const sapClientRef: { sapClient: string | undefined; isValid: boolean } = { sapClient: undefined, isValid: true };

    const questions: Question<AbapOnPremAnswers>[] = [
        getSystemUrlQuestion<AbapOnPremAnswers>(connectValidator, abapOnPremPromptNamespace, requiredOdataVersion),
        {
            type: 'input',
            name: abapOnPremPromptNames.sapClient,
            message: t('prompts.sapClient.message'),
            guiOptions: {
                breadcrumb: t('prompts.sapClient.breadcrumb')
            },
            validate: (client) => {
                const valRes = validateClient(client);
                if (valRes === true) {
                    sapClientRef.sapClient = client;
                    sapClientRef.isValid = true;
                    return true;
                }
                sapClientRef.sapClient = undefined;
                sapClientRef.isValid = false;
                return valRes;
            }
        } as InputQuestion<AbapOnPremAnswers>,
        ...getCredentialsPrompts<AbabpOnPremCredentialsAnswers>(
            connectValidator,
            abapOnPremPromptNamespace,
            sapClientRef
        )
    ];

    if (systemNamePromptOptions?.hide !== true) {
        // New system question will allow user to give the system a user friendly name
        questions.push(
            withCondition(
                [getUserSystemNameQuestion(connectValidator, abapOnPremPromptNamespace)],
                (answers: AbapOnPremAnswers) =>
                    !!answers?.[systemUrlPromptName] &&
                    connectValidator.validity.reachable === true &&
                    (connectValidator.validity.authenticated || connectValidator.validity.authRequired !== true)
            )[0]
        );
    }

    return questions;
}

/**
 * Re-usable credentials prompts for connection to systems using basic auth.
 *
 * @param connectionValidator
 * @param promptNamespace
 * @param sapClient
 * @param sapClient.sapClient the sapClient value to be used along with the credentials validation
 * @param sapClient.isValid validation of credentials is deferred until a valid sapClient is provided or undefined
 * @param backendSystem
 * @param backendSystem.backendSystem if provided will be updated with the authenticated system credentials
 * @returns the credentials prompts
 */
export function getCredentialsPrompts<T extends Answers>(
    connectionValidator: ConnectionValidator,
    promptNamespace?: string,
    sapClient?: { sapClient: string | undefined; isValid: boolean },
    backendSystem?: { backendSystem: BackendSystem | undefined }
): Question<T>[] {
    const usernamePromptName = `${promptNamespace ? promptNamespace + ':' : ''}${
        BasicCredentialsPromptNames.systemUsername
    }`;
    const passwordPromptName = `${promptNamespace ? promptNamespace + ':' : ''}${
        BasicCredentialsPromptNames.systemPassword
    }`;
    return [
        {
            when: () => connectionValidator.systemAuthType === 'basic' && connectionValidator.isAuthRequired(),
            type: 'input',
            name: usernamePromptName,
            message: t('prompts.systemUsername.message'),
            guiOptions: {
                mandatory: true
            },
            default: '',
            validate: (user: string) => user?.length > 0
        } as InputQuestion<T>,
        {
            when: () => connectionValidator.systemAuthType === 'basic' && connectionValidator.isAuthRequired(),
            type: 'password',
            guiOptions: {
                mandatory: true
            },
            guiType: 'login',
            name: passwordPromptName,
            message: t('prompts.systemPassword.message'),
            mask: '*',
            default: '',
            validate: async (password, answers: T) => {
                if (
                    !(
                        connectionValidator.validatedUrl &&
                        answers?.[usernamePromptName] &&
                        password &&
                        (sapClient?.isValid || !sapClient)
                    )
                ) {
                    return false;
                }
                const valResult = await connectionValidator.validateAuth(
                    connectionValidator.validatedUrl,
                    answers?.[usernamePromptName],
                    password,
                    {
                        sapClient: sapClient?.sapClient || backendSystem?.backendSystem?.client,
                        isSystem: true
                    }
                );
                if (valResult === true && connectionValidator.serviceProvider) {
                    PromptState.odataService.connectedSystem = {
                        serviceProvider: connectionValidator.serviceProvider
                    };
                    // If the connection is successful and we have backend system ref (which indicates an existing backend system),
                    // update the existing backend system with the new credentials that may be used to update in the store.
                    if (backendSystem?.backendSystem) {
                        PromptState.odataService.connectedSystem.backendSystem = Object.assign(
                            backendSystem.backendSystem,
                            {
                                username: answers?.[usernamePromptName],
                                password,
                                newOrUpdated: true
                            } as Partial<BackendSystem>
                        );
                    }
                    return true;
                }
                return valResult;
            }
        } as PasswordQuestion<T>
    ];
}
