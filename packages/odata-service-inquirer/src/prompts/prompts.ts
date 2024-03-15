import { Severity } from '@sap-devx/yeoman-ui-types';
import type { YUIQuestion } from '@sap-ux/inquirer-common';
import { t } from '../i18n';
import {
    DatasourceType,
    promptNames,
    type DatasourceTypePromptOptions,
    type OdataServicePromptOptions
} from '../types';
import { extendWithOptions, getDatasourceTypeChoices } from './prompt-helpers';

/**
 * Get the prompts for the OData service inquirer.
 *
 * @param promptOptions
 */
export function getQuestions(promptOptions?: OdataServicePromptOptions) {
    let questions: YUIQuestion[] = [getDatasourceTypeQuestion(promptOptions?.datasourceType)];
    // Apply extended `validate`, `additionalMessages` or override `default` prompt properties
    if (promptOptions) {
        questions = extendWithOptions(questions, promptOptions);
    }

    return questions;
}

/**
 *
 * @param options
 */
export function getDatasourceTypeQuestion(options?: DatasourceTypePromptOptions): YUIQuestion {
    const choices = getDatasourceTypeChoices(options);
    return {
        type: 'list',
        name: promptNames.datasourceType,
        guiOptions: {
            breadcrumb: true
        },
        default: DatasourceType.SAP_SYSTEM,
        message: t('prompts.datasourceType.message'),
        choices,
        additionalMessages: (source) => {
            if (source === DatasourceType.BUSINESS_HUB) {
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
