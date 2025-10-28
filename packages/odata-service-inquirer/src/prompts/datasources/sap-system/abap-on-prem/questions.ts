import { withCondition } from '@sap-ux/inquirer-common';
import type { OdataVersion } from '@sap-ux/odata-service-writer';
import { validateClient } from '@sap-ux/project-input-validator';
import type { InputQuestion, Question } from 'inquirer';
import { t } from '../../../../i18n';
import {
    type OdataServiceAnswers,
    type OdataServicePromptOptions,
    type ServiceSelectionPromptOptions,
    type SystemNamePromptOptions
} from '../../../../types';
import { isBackendSystemKeyExisting, PromptState } from '../../../../utils';
import { ConnectionValidator } from '../../../connectionValidator';
import { BasicCredentialsPromptNames, getCredentialsPrompts } from '../credentials/questions';
import { getSystemUrlQuestion, getUserSystemNameQuestion } from '../shared-prompts/shared-prompts';
import { newSystemPromptNames } from '../new-system/types';
import { getSystemServiceQuestion, type ServiceAnswer } from '../service-selection';

const abapOnPremPromptNamespace = 'abapOnPrem';
const systemUrlPromptName = `${abapOnPremPromptNamespace}:${newSystemPromptNames.newSystemUrl}` as const;
const usernamePromptName = `${abapOnPremPromptNamespace}:${BasicCredentialsPromptNames.systemUsername}` as const;
const passwordPromptName = `${abapOnPremPromptNamespace}:${BasicCredentialsPromptNames.systemPassword}` as const;

const abapOnPremPromptNames = {
    sapClient: 'sapClient'
};

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

    questions.push(
        ...getSystemServiceQuestion(connectValidator, abapOnPremPromptNamespace, promptOptions?.serviceSelection)
    );

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
        getSystemUrlQuestion<AbapOnPremAnswers>(
            connectValidator,
            abapOnPremPromptNamespace,
            requiredOdataVersion,
            undefined,
            false
        ),
        {
            type: 'input',
            name: abapOnPremPromptNames.sapClient,
            message: t('prompts.sapClient.message'),
            guiOptions: {
                breadcrumb: t('prompts.sapClient.breadcrumb')
            },
            validate: (client, prevAnswers: AbapOnPremAnswers) => {
                const valRes = validateClient(client);
                if (valRes === true) {
                    sapClientRef.sapClient = client;
                    sapClientRef.isValid = true;
                    // If we also have a system url, warn about existing stored system overwrite
                    if (prevAnswers?.[systemUrlPromptName]) {
                        const existingBackend = isBackendSystemKeyExisting(
                            PromptState.backendSystemsCache,
                            prevAnswers[systemUrlPromptName],
                            client
                        );
                        if (existingBackend) {
                            // Prevents further prompts by setting the client to invalid
                            // This is a temp workaround until multiple systems with the same url/client key is supported
                            sapClientRef.isValid = false;
                            return t('prompts.validationMessages.backendSystemExistsWarning', {
                                backendName: existingBackend.name
                            });
                        }
                    }
                    return true;
                }
                sapClientRef.sapClient = undefined;
                sapClientRef.isValid = false;
                return valRes;
            }
        } as InputQuestion<AbapOnPremAnswers>,
        ...getCredentialsPrompts<AbapOnPremAnswers>(connectValidator, abapOnPremPromptNamespace, sapClientRef)
    ];

    if (systemNamePromptOptions?.hide !== true) {
        // New system question will allow user to give the system a user friendly name
        questions.push(
            withCondition(
                [getUserSystemNameQuestion(connectValidator, abapOnPremPromptNamespace)],
                (answers: AbapOnPremAnswers) =>
                    !!answers?.[systemUrlPromptName] &&
                    connectValidator.validity.reachable === true &&
                    (connectValidator.validity.authenticated || connectValidator.validity.authRequired === false)
            )[0]
        );
    }

    return questions;
}
