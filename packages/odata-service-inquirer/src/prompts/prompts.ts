import { Severity } from '@sap-devx/yeoman-ui-types';
import { withCondition, type YUIQuestion } from '@sap-ux/inquirer-common';
import type { Answers, Question } from 'inquirer';
import { t } from '../i18n';
import type { OdataServiceAnswers, OdataServiceQuestion } from '../types';
import {
    DatasourceType,
    promptNames,
    type DatasourceTypePromptOptions,
    type OdataServicePromptOptions
} from '../types';
import { getMetadataFileQuestion } from './datasources/metadata-file';
import { extendWithOptions, getDatasourceTypeChoices } from './prompt-helpers';
import { getLocalCapProjectPrompts } from './datasources/cap-project/questions';

/**
 * Get the prompts for the OData service inquirer.
 *
 * @param promptOptions
 * @returns the prompts used to provide input for OData service generation
 */
export async function getQuestions(promptOptions?: OdataServicePromptOptions): Promise<OdataServiceQuestion[]> {
    let questions: OdataServiceQuestion[] = [getDatasourceTypeQuestion(promptOptions?.datasourceType)];

    // Add conditional questions depending on the selected source
    questions.push(...(await getDatasourceTypeConditionalQuestions(promptOptions)));

    // Apply extended `validate`, `additionalMessages` or override `default` prompt properties
    if (promptOptions) {
        questions = extendWithOptions(questions as YUIQuestion[], promptOptions);
    }

    return questions;
}

/**
 * Get the datasource type question.
 *
 * @param options
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
        choices,
        additionalMessages: (source) => {
            if (source === DatasourceType.buiness_hub) {
                return {
                    message: t('prompts.nonUIServiceTypeWarningMessage', {
                        serviceTypeDesc: t('prompts.datasourceType.businessHubName')
                    }),
                    severity: Severity.warning
                };
            }
        }
    } as YUIQuestion;
}

/**
 * Apply addiitonal when conditions based on the datasource type answer.
 *
 * @param promptOptions
 * @returns
 */
async function getDatasourceTypeConditionalQuestions(
    promptOptions?: OdataServicePromptOptions
): Promise<OdataServiceQuestion[]> {
    const conditionalQuestions: OdataServiceQuestion[] = [];

    conditionalQuestions.push(
        ...(withCondition(
            [getMetadataFileQuestion(promptOptions?.metadata) as Question],
            (answers: Answers) => (answers as OdataServiceAnswers).datasourceType === DatasourceType.metadata_file
        ) as OdataServiceQuestion[])
    );

    conditionalQuestions.push(
        ...(withCondition(
            getLocalCapProjectPrompts(promptOptions) as Question[],
            (answers: Answers) => (answers as OdataServiceAnswers).datasourceType === DatasourceType.cap_project
        ) as OdataServiceQuestion[])
    );

    //...

    return conditionalQuestions;
}
