import type { NumberQuestion, ListQuestion, InputQuestion, YUIQuestion } from '@sap-ux/inquirer-common';
import type { ManifestNamespace } from '@sap-ux/project-access';
import type { ChangeDataSourceAnswers } from '../../types';
import { t } from '../../i18n';
import { getDataSourceIds } from '../utils';
import { isNotEmptyString } from '../../base/helper';

/**
 * Gets the prompts for changing the data source.
 *
 * @param {Record<string, ManifestNamespace.DataSource>} datasources data sources from the manifest
 * @returns {YUIQuestion<ChangeDataSourceAnswers>[]} the questions/prompts
 */
export function getPrompts(
    datasources: Record<string, ManifestNamespace.DataSource>
): YUIQuestion<ChangeDataSourceAnswers>[] {
    const dataSourceIds = getDataSourceIds(datasources);
    return [
        {
            type: 'list',
            name: 'dataSourceId',
            message: t('prompts.oDataSourceLabel'),
            choices: dataSourceIds,
            default: dataSourceIds?.[0],
            store: false,
            guiOptions: {
                mandatory: true,
                hint: t('prompts.oDataSourceTooltip')
            }
        } as ListQuestion<ChangeDataSourceAnswers>,
        {
            type: 'input',
            name: 'dataSourceUri',
            message: t('prompts.oDataSourceURILabel'),
            guiOptions: {
                mandatory: true,
                hint: t('prompts.oDataSourceURITooltip')
            },
            validate: isNotEmptyString,
            when: !!dataSourceIds.length,
            store: false
        } as InputQuestion<ChangeDataSourceAnswers>,
        {
            type: 'number',
            name: 'dataSourceSettingsMaxAge',
            message: t('prompts.maxAgeLabel'),
            when: (answers: ChangeDataSourceAnswers) => answers.dataSourceUri !== ''
        } as NumberQuestion<ChangeDataSourceAnswers>,
        {
            type: 'input',
            name: 'annotationUri',
            message: t('prompts.oDataAnnotationSourceURILabel'),
            guiOptions: {
                hint: t('prompts.oDataAnnotationSourceURITooltip')
            }
        } as InputQuestion<ChangeDataSourceAnswers>
    ];
}
