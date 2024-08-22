import { withCondition } from '@sap-ux/inquirer-common';
import type { OdataVersion } from '@sap-ux/odata-service-writer';
import { validateClient } from '@sap-ux/project-input-validator';
import type { Answers, InputQuestion, PasswordQuestion, Question } from 'inquirer';
import { t } from '../../../../i18n';
import type { promptNames } from '../../../../types';
import {
    type OdataServiceAnswers,
    type OdataServicePromptOptions,
    type ServiceSelectionPromptOptions,
    type SystemNamePromptOptions
} from '../../../../types';
import { PromptState } from '../../../../utils';
import { ConnectionValidator } from '../../../connectionValidator';
import { getSystemServiceQuestion, getSystemUrlQuestion, getUserSystemNameQuestion } from '../new-system/questions';
import { newSystemPromptNames, type ServiceAnswer } from '../new-system/types';

const abapOnPremPromptNamespace = 'abapOnPrem';
const systemUrlPromptName = `${abapOnPremPromptNamespace}:${newSystemPromptNames.newSystemUrl}` as const;

export enum abapOnPremInternalPromptNames {
    sapClient = 'sapClient',
    systemUsername = 'abapSystemUsername',
    systemPassword = 'abapSystemPassword'
}

interface AbapOnPremAnswers extends Partial<OdataServiceAnswers> {
    [systemUrlPromptName]?: string;
    [abapOnPremInternalPromptNames.systemUsername]?: string;
    [abapOnPremInternalPromptNames.systemPassword]?: string;
    [promptNames.serviceSelection]?: ServiceAnswer;
}

/**
 * Get the Abap on-premise datasource questions.
 *
 * @param promptOptions options for prompts. Applicable options are: {@link ServiceSelectionPromptOptions}, {@link SystemNamePromptOptions}
 * @returns property questions for the Abap on-premise datasource
 */
export function getAbapOnPremQuestions(promptOptions?: OdataServicePromptOptions): Question<AbapOnPremAnswers>[] {
    PromptState.reset();
    const connectValidator = new ConnectionValidator();
    // Prompt options
    const requiredOdataVersion = promptOptions?.serviceSelection?.requiredOdataVersion;

    const questions: Question<AbapOnPremAnswers>[] = getAbapOnPremSystemQuestions(
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
    let validClient = true;

    const questions: Question<AbapOnPremAnswers>[] = [
        getSystemUrlQuestion<AbapOnPremAnswers>(connectValidator, abapOnPremPromptNamespace, requiredOdataVersion),
        {
            type: 'input',
            name: abapOnPremInternalPromptNames.sapClient,
            message: t('prompts.sapClient.message'),
            guiOptions: {
                breadcrumb: t('prompts.sapClient.breadcrumb')
            },
            validate: (client) => {
                const valRes = validateClient(client);
                if (valRes === true) {
                    return (validClient = true);
                }
                validClient = false;
                return valRes;
            }
        } as InputQuestion<AbapOnPremAnswers>,
        {
            when: () => connectValidator.isAuthRequired(),
            type: 'input',
            name: abapOnPremInternalPromptNames.systemUsername,
            message: t('prompts.systemUsername.message'),
            guiOptions: {
                mandatory: true
            },
            default: '',
            validate: (user: string) => user?.length > 0
        } as InputQuestion<AbapOnPremAnswers>,
        {
            when: () => connectValidator.isAuthRequired(),
            type: 'password',
            guiOptions: {
                mandatory: true
            },
            name: abapOnPremInternalPromptNames.systemPassword,
            message: t('prompts.systemPassword.message'),
            guiType: 'login',
            mask: '*',
            default: '',
            validate: async (password, answers: AbapOnPremAnswers & Answers) => {
                if (!(connectValidator.validatedUrl && answers.abapSystemUsername && password && validClient)) {
                    return false;
                }
                const valResult = await connectValidator.validateAuth(
                    connectValidator.validatedUrl,
                    answers.abapSystemUsername,
                    password,
                    {
                        sapClient: answers.sapClient,
                        isSystem: true
                    }
                );
                if (valResult === true && connectValidator.serviceProvider) {
                    PromptState.odataService.connectedSystem = {
                        serviceProvider: connectValidator.serviceProvider
                    };
                    return true;
                }
                return valResult;
            }
        } as PasswordQuestion<AbapOnPremAnswers>
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
