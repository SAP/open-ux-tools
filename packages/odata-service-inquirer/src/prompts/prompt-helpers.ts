import { isAppStudio } from '@sap-ux/btp-utils';
import type { ListChoiceOptions } from 'inquirer';
import { ErrorHandler } from '../error-handler/error-handler';
import { t } from '../i18n';
import { DatasourceType, type DatasourceTypePromptOptions } from '../types';

// Error handling is a cross-cutting concern, a single instance is required
export const errorHandler = new ErrorHandler();

/**
 * Get the datasource type choices.
 *
 * @param options - optionally include some of the supported datasource type choices
 * @param options.includeNone - Include the `NONE` option in the datasource type prompt
 * @param options.includeProjectSpecificDest - Include the `projectSpecificDestination` option in the datasource type prompt
 * @returns The datasource type choices
 */
export function getDatasourceTypeChoices({
    includeNone = false,
    includeProjectSpecificDest = false
}: DatasourceTypePromptOptions = {}): ListChoiceOptions[] {
    const choices: ListChoiceOptions[] = [
        {
            name: t('prompts.datasourceType.sapSystemChoiceText'),
            value: DatasourceType.sapSystem
        },
        {
            name: t('prompts.datasourceType.odataServiceUrlChoiceText'),
            value: DatasourceType.odataServiceUrl
        },
        { name: t('prompts.datasourceType.businessHubChoiceText'), value: DatasourceType.businessHub }
    ];

    if (isAppStudio() && includeProjectSpecificDest) {
        choices.push({
            name: t('prompts.datasourceType.projectSpecificDestChoiceText'),
            value: DatasourceType.projectSpecificDestination
        });
    }

    choices.push({ name: t('prompts.datasourceType.capProjectChoiceText'), value: DatasourceType.capProject });
    choices.push({ name: t('prompts.datasourceType.metadataFileChoiceText'), value: DatasourceType.metadataFile });

    if (includeNone) {
        choices.unshift({ name: t('prompts.datasourceType.noneName'), value: DatasourceType.none });
    }

    return choices;
}
