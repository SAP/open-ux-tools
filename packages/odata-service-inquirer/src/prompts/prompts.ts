import { withCondition, type YUIQuestion } from '@sap-ux/inquirer-common';
import type { Answers, Question } from 'inquirer';
import { t } from '../i18n';
import {
    DatasourceType,
    promptNames,
    type ConnectedSystem,
    type DatasourceTypePromptOptions,
    type OdataServiceAnswers,
    type OdataServicePromptOptions,
    type OdataServiceQuestion
} from '../types';
import { getLocalCapProjectPrompts } from './datasources/cap-project/questions';
import { getMetadataFileQuestion } from './datasources/metadata-file';
import { getSystemSelectionQuestions } from './datasources/sap-system/system-selection';
import { getServiceUrlQuestions } from './datasources/service-url/questions';
import { getDatasourceTypeChoices } from './prompt-helpers';

/**
 * Get the prompts for the OData service inquirer.
 *
 * @param promptOptions - options that can control some of the prompt behavior. See {@link OdataServicePromptOptions} for details
 * @param connectedSystem - if available passing an already connected system connection will prevent re-authentication for re-entrance ticket and service keys connection types
 * @returns the prompts used to provide input for OData service generation
 */
export async function getQuestions(
    promptOptions?: OdataServicePromptOptions,
    connectedSystem?: ConnectedSystem
): Promise<OdataServiceQuestion[]> {
    const questions: OdataServiceQuestion[] = [getDatasourceTypeQuestion(promptOptions?.datasourceType)];

    // Add conditional questions depending on the selected source
    questions.push(...(await getDatasourceTypeConditionalQuestions(promptOptions, connectedSystem)));

    return questions;
}

/**
 * Get the datasource type question.
 *
 * @param options - options that can control some of the prompt behavior. See {@link DatasourceTypePromptOptions} for details
 * @returns the datasource type question
 */
function getDatasourceTypeQuestion(options?: DatasourceTypePromptOptions): YUIQuestion<OdataServiceAnswers> {
    const choices = getDatasourceTypeChoices(options);
    return {
        type: 'list',
        name: promptNames.datasourceType,
        guiOptions: {
            breadcrumb: true
        },
        default: options?.default ?? -1,
        message: t('prompts.datasourceType.message'),
        choices
    } as YUIQuestion;
}

/**
 * Apply addiitonal when conditions based on the datasource type answer.
 *
 * @param promptOptions - options that can control some of the prompt behavior. See {@link OdataServicePromptOptions} for details
 * @param connectedSystem
 * @returns the conditional questions based on the datasource type answer
 */
async function getDatasourceTypeConditionalQuestions(
    promptOptions?: OdataServicePromptOptions,
    connectedSystem?: ConnectedSystem
): Promise<OdataServiceQuestion[]> {
    const conditionalQuestions: OdataServiceQuestion[] = [];

    conditionalQuestions.push(
        ...(withCondition(
            (await getSystemSelectionQuestions(promptOptions, connectedSystem)) as Question[],
            (answers: Answers) => (answers as OdataServiceAnswers).datasourceType === DatasourceType.sapSystem
        ) as OdataServiceQuestion[])
    );

    conditionalQuestions.push(
        ...(withCondition(
            [getMetadataFileQuestion(promptOptions?.metadataFilePath) as Question],
            (answers: Answers) => (answers as OdataServiceAnswers).datasourceType === DatasourceType.metadataFile
        ) as OdataServiceQuestion[])
    );

    conditionalQuestions.push(
        ...(withCondition(
            getLocalCapProjectPrompts(promptOptions) as Question[],
            (answers: Answers) => (answers as OdataServiceAnswers).datasourceType === DatasourceType.capProject
        ) as OdataServiceQuestion[])
    );

    conditionalQuestions.push(
        ...(withCondition(
            getServiceUrlQuestions(promptOptions?.serviceUrl) as Question[],
            (answers: Answers) => (answers as OdataServiceAnswers).datasourceType === DatasourceType.odataServiceUrl
        ) as OdataServiceQuestion[])
    );

    return conditionalQuestions;
}
