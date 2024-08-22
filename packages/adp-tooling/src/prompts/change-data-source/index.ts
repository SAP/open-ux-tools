import type { NumberQuestion, ListQuestion, InputQuestion, YUIQuestion } from '@sap-ux/inquirer-common';
import type { ManifestNamespace } from '@sap-ux/project-access';
import type { ChangeDataSourceAnswers } from '../../types';
import { t } from '../../i18n';
import { filterDataSourcesByType } from '@sap-ux/project-access';
import { validateEmptyString, isDataSourceURI } from '@sap-ux/project-input-validator';

/**
 * Validates the OData Source URI prompt.
 *
 * @param value The value to validate.
 * @returns {boolean | string} True if the URI is valid, or an error message if validation fails.
 */
function validatePromptOdataURI(value: string): boolean | string {
    const validationResult = validateEmptyString(value);
    if (typeof validationResult === 'string') {
        return validationResult;
    }

    if (!isDataSourceURI(value)) {
        return t('validators.errorInvalidDataSourceURI');
    }

    return true;
}

/**
 * Validates the Annotation URI prompt.
 *
 * @param value The value to validate.
 * @returns {boolean | string} True if the URI is valid, or an error message if validation fails.
 */
function validatePromptAnnotationURI(value: string): boolean | string {
    const validationResult = validateEmptyString(value);
    if (typeof validationResult === 'string') {
        return true;
    }

    if (!isDataSourceURI(value)) {
        return t('validators.errorInvalidDataSourceURI');
    }

    return true;
}

/**
 * Gets the prompts for changing the data source.
 *
 * @param {Record<string, ManifestNamespace.DataSource>} dataSources - Data sources from the manifest.
 * @returns {YUIQuestion<ChangeDataSourceAnswers>[]} The questions/prompts.
 */
export function getPrompts(
    dataSources: Record<string, ManifestNamespace.DataSource>
): YUIQuestion<ChangeDataSourceAnswers>[] {
    const dataSourceIds = Object.keys(filterDataSourcesByType(dataSources, 'OData'));
    return [
        {
            type: 'list',
            name: 'id',
            message: t('prompts.oDataSourceLabel'),
            choices: dataSourceIds,
            default: dataSourceIds[0],
            store: false,
            guiOptions: {
                mandatory: true,
                hint: t('prompts.oDataSourceTooltip')
            }
        } as ListQuestion<ChangeDataSourceAnswers>,
        {
            type: 'input',
            name: 'uri',
            message: t('prompts.oDataSourceURILabel'),
            guiOptions: {
                mandatory: true,
                hint: t('prompts.oDataSourceURITooltip')
            },
            validate: validatePromptOdataURI,
            when: !!dataSourceIds.length,
            store: false
        } as InputQuestion<ChangeDataSourceAnswers>,
        {
            type: 'number',
            name: 'maxAge',
            message: t('prompts.maxAgeLabel'),
            guiOptions: {
                hint: t('prompts.maxAgeTooltip')
            },
            when: (answers: ChangeDataSourceAnswers) => answers.uri !== ''
        } as NumberQuestion<ChangeDataSourceAnswers>,
        {
            type: 'input',
            name: 'annotationUri',
            message: t('prompts.oDataAnnotationSourceURILabel'),
            guiOptions: {
                hint: t('prompts.oDataAnnotationSourceURITooltip')
            },
            validate: validatePromptAnnotationURI
        } as InputQuestion<ChangeDataSourceAnswers>
    ];
}
