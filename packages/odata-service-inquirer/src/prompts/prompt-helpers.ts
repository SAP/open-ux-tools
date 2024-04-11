import { isAppStudio } from '@sap-ux/btp-utils';
import { extendAdditionalMessages, extendValidate, type YUIQuestion } from '@sap-ux/inquirer-common';
import type { ListChoiceOptions } from 'inquirer';
import { ErrorHandler } from '../error-handler/errorHandler';
import { t } from '../i18n';
import {
    DatasourceType,
    type CommonPromptOptions,
    type DatasourceTypePromptOptions,
    type OdataServiceAnswers,
    type OdataServicePromptOptions,
    type PromptDefaultValue,
    type promptNames
} from '../types';
// Error handling is a cross-cutting concern and should be handled in a single place.
export const errorHandler = new ErrorHandler();

/**
 * Extend the existing prompt property function with the one specified in prompt options or add as new.
 *
 * @param question - the question to which the extending function will be applied
 * @param promptOption - prompt options, containing extending functions
 * @param funcName - the question property (function) name to extend
 * @returns the extended question
 */
function applyExtensionFunction(
    question: YUIQuestion,
    promptOption: CommonPromptOptions,
    funcName: 'validate' | 'additionalMessages'
): YUIQuestion {
    let extendedFunc;

    if (funcName === 'validate' && promptOption.validate) {
        extendedFunc = extendValidate(question, promptOption.validate);
    }

    if (funcName === 'additionalMessages' && promptOption.additionalMessages) {
        extendedFunc = extendAdditionalMessages(question, promptOption.additionalMessages);
    }

    question = Object.assign(question, { [funcName]: extendedFunc });
    return question;
}
/**
 * Updates questions with extensions for specific properties.
 *
 * @param questions - array of prompts to be extended
 * @param promptOptions - the prompt options possibly containing function extensions
 * @returns - the extended questions
 */
export function extendWithOptions(questions: YUIQuestion[], promptOptions: OdataServicePromptOptions): YUIQuestion[] {
    questions.forEach((question) => {
        const promptOptKey = question.name as keyof typeof promptNames;
        const promptOpt = promptOptions[promptOptKey];
        if (promptOpt) {
            const propsToExtend = Object.keys(promptOpt);

            for (const extProp of propsToExtend) {
                if (extProp === 'validate' || extProp === 'additionalMessages') {
                    question = applyExtensionFunction(question, promptOpt as CommonPromptOptions, extProp);
                }
                // Provided default will override built in defaults, regardless of the default type (function or value)
                const defaultOverride = (promptOptions[promptOptKey] as PromptDefaultValue<string | boolean>).default;
                if (defaultOverride) {
                    question.default = defaultOverride;
                }
            }
        }
    });
    return questions;
}

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
        { name: t('prompts.datasourceType.businessHubChoiceText'), value: DatasourceType.buiness_hub }
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
 * Much of the values returned by the service inquirer prompting are derived from prompt answers and not direct answer values.
 * Since inquirer does not provide a way to return values that are not direct answers from prompts, this class will maintain the derived values
 * across prompts statically for the lifespan of the prompting session.
 *
 */
export class PromptStateHelper {
    static odataService: Partial<OdataServiceAnswers> = {};
}
