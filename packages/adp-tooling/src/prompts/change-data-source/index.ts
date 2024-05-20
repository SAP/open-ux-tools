import type { NumberQuestion, ListQuestion, InputQuestion } from '@sap-ux/inquirer-common';
import type {
    AdpChangeDataSourceQuestion,
    AdpChangeDataSourceAnswers,
    AdpChangeDataSourceQuestions
} from '../../types';
import { t } from '../../i18n';
import { validateURI, validateODataServices } from '../validators';

/**
 * Gets the prompts for changing the data source.
 *
 * @param {AdpChangeDataSourceQuestions} data - the data for the questions
 * @returns {AdpChangeDataSourceQuestion[]} - the questions
 */
export function getPrompts(data: AdpChangeDataSourceQuestions): AdpChangeDataSourceQuestion[] {
    return [
        {
            type: 'list',
            name: 'targetODataSource',
            message: t('prompts.oDataSourceLabel'),
            choices: data.oDataSources?.map((dS) => dS.dataSourceName) ?? [],
            default: data.oDataSources?.[0]?.dataSourceName,
            store: false,
            guiOptions: {
                mandatory: true,
                hint: t('prompts.oDataSourceTooltip')
            },
            validate: (value: string) => validateODataServices(value, data.oDataSources)
        } as ListQuestion<AdpChangeDataSourceAnswers>,
        {
            type: 'input',
            name: 'oDataSourceURI',
            message: t('prompts.oDataSourceURILabel'),
            guiOptions: {
                mandatory: true,
                hint: t('prompts.oDataSourceURITooltip')
            },
            validate: (value: string) => validateURI(value, t('prompts.oDataSourceURILabel')),
            when: !!data.oDataSources.length,
            store: false
        } as InputQuestion<AdpChangeDataSourceAnswers>,
        {
            type: 'number',
            name: 'maxAge',
            message: t('prompts.maxAgeLabel'),
            guiOptions: {
                mandatory: false
            },
            when: (answers: AdpChangeDataSourceAnswers) => answers.oDataSourceURI !== '',
            default: null
        } as NumberQuestion<AdpChangeDataSourceAnswers>,
        {
            type: 'input',
            name: 'oDataAnnotationSourceURI',
            message: t('prompts.oDataAnnotationSourceURILabel'),
            validate: (value: string) => validateURI(value, t('prompts.oDataAnnotationSourceURILabel'), false),
            guiOptions: {
                mandatory: false,
                hint: t('prompts.oDataAnnotationSourceURITooltip')
            },
            when: (answers: AdpChangeDataSourceAnswers) => {
                const selectedOdataSource = answers.targetODataSource ?? '';
                const selectOdataSourceAnnotation = data.oDataSourcesDictionary[selectedOdataSource];
                if (!selectOdataSourceAnnotation) {
                    return false;
                }
                const annotationUri = data.oDataAnnotations[selectOdataSourceAnnotation];

                return annotationUri.startsWith('/sap/opu/odata/') || annotationUri.startsWith('/sap/opu/odata4/');
            }
        } as InputQuestion<AdpChangeDataSourceAnswers>
    ];
}
