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
import { getDatasourceTypeChoices } from './prompt-helpers';
import { getLocalCapProjectPrompts } from './datasources/cap-project/questions';
import LoggerHelper from './logger-helper';

/**
 * Get the prompts for the OData service inquirer.
 *
 * @param promptOptions
 * @returns the prompts used to provide input for OData service generation
 */
export async function getQuestions(promptOptions?: OdataServicePromptOptions): Promise<OdataServiceQuestion[]> {
    const questions: OdataServiceQuestion[] = [getDatasourceTypeQuestion(promptOptions?.datasourceType)];

    // Add conditional questions depending on the selected source
    questions.push(...(await getDatasourceTypeConditionalQuestions(promptOptions)));

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
        additionalMessages: (source: DatasourceType) => {
            if (
                [
                    DatasourceType.business_hub,
                    DatasourceType.none,
                    DatasourceType.odata_service_url,
                    DatasourceType.project_specific_destination,
                    DatasourceType.sap_system
                ].includes(source)
            ) {
                LoggerHelper.logger?.warn(
                    t('prompts.datasourceType.notYetImplemenetdWarningMessage', { datasourceType: source })
                );
                return {
                    message: t('prompts.datasourceType.notYetImplemenetdWarningMessage', { datasourceType: source }),
                    severity: Severity.warning
                };
            }
            if (source === DatasourceType.business_hub) {
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
            [getMetadataFileQuestion(promptOptions?.metadataFilePath) as Question],
            (answers: Answers) => (answers as OdataServiceAnswers).datasourceType === DatasourceType.metadata_file
        ) as OdataServiceQuestion[])
    );

    conditionalQuestions.push(
        ...(withCondition(
            getLocalCapProjectPrompts(promptOptions) as Question[],
            (answers: Answers) => (answers as OdataServiceAnswers).datasourceType === DatasourceType.cap_project
        ) as OdataServiceQuestion[])
    );

    //...further data sources to be added here

    return conditionalQuestions;
}
