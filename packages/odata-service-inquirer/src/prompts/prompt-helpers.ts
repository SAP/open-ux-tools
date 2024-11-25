import type { ListChoiceOptions } from 'inquirer';
import { ErrorHandler } from '@sap-ux/inquirer-common';
import { t } from '../i18n';
import { DatasourceType, type DatasourceTypePromptOptions } from '../types';

// Error handling is a cross-cutting concern, a single instance is required
export const errorHandler = new ErrorHandler();

/**
 * Get the datasource type choices.
 *
 * @param options - optionally include some of the supported datasource type choices
 * @param options.includeNone - Include the `NONE` option in the datasource type prompt
 * @returns The datasource type choices
 */
export function getDatasourceTypeChoices({
    includeNone = false
}: DatasourceTypePromptOptions = {}): ListChoiceOptions[] {
    const choices: ListChoiceOptions[] = [
        {
            name: t('prompts.datasourceType.sapSystemChoiceText'),
            value: DatasourceType.sapSystem
        },
        {
            name: t('prompts.datasourceType.odataServiceUrlChoiceText'),
            value: DatasourceType.odataServiceUrl
        }
    ];

    choices.push({ name: t('prompts.datasourceType.capProjectChoiceText'), value: DatasourceType.capProject });
    choices.push({ name: t('prompts.datasourceType.metadataFileChoiceText'), value: DatasourceType.metadataFile });

    if (includeNone) {
        choices.unshift({ name: t('prompts.datasourceType.noneName'), value: DatasourceType.none });
    }

    return choices;
}
