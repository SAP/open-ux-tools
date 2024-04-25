import { isAppStudio } from '@sap-ux/btp-utils';
import type { ListChoiceOptions } from 'inquirer';
import { ErrorHandler } from '../error-handler/error-handler';
import { t } from '../i18n';
import { DatasourceType, type DatasourceTypePromptOptions, type OdataServiceAnswers } from '../types';

// Error handling is a cross-cutting concern, a single instance is required
export const errorHandler = new ErrorHandler();

/**
 * Get the datasource type choices.
 *
 * @param options - optionally include some of the supported datasource type choices
 * @param options.includeNone - Include the `NONE` option in the datasource type prompt
 * @param options.includeProjectSpecificDest - Include the `PROJECT_SPECIFIC_DESTINATION` option in the datasource type prompt
 * @returns The datasource type choices
 */
export function getDatasourceTypeChoices({
    includeNone = false,
    includeProjectSpecificDest = false
}: DatasourceTypePromptOptions = {}): ListChoiceOptions[] {
    const choices: ListChoiceOptions[] = [
        {
            name: t('prompts.datasourceType.sapSystemChoiceText'),
            value: DatasourceType.sap_system
        },
        {
            name: t('prompts.datasourceType.odataServiceUrlChoiceText'),
            value: DatasourceType.odata_service_url
        },
        { name: t('prompts.datasourceType.businessHubChoiceText'), value: DatasourceType.business_hub }
    ];

    if (isAppStudio() && includeProjectSpecificDest) {
        choices.push({
            name: t('prompts.datasourceType.projectSpecificDestChoiceText'),
            value: DatasourceType.project_specific_destination
        });
    }

    choices.push({ name: t('prompts.datasourceType.capProjectChoiceText'), value: DatasourceType.cap_project });
    choices.push({ name: t('prompts.datasourceType.metadataFileChoiceText'), value: DatasourceType.metadata_file });

    if (includeNone) {
        choices.unshift({ name: t('prompts.datasourceType.noneName'), value: DatasourceType.none });
    }

    return choices;
}

/**
 * Much of the values returned by the service inquirer prompting are derived from prompt answers and are not direct answer values.
 * Since inquirer does not provide a way to return values that are not direct answers from prompts, this class will maintain the derived values
 * across prompts statically for the lifespan of the prompting session.
 *
 */
export class PromptStateHelper {
    static odataService: Partial<OdataServiceAnswers> = {};
    static reset(): void {
        PromptStateHelper.odataService = {};
    }
}
