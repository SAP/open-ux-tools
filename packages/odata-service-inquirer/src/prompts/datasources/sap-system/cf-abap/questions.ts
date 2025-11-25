import type { Question } from 'inquirer';
import type { ServiceSelectionPromptOptions, ValueHelpDownloadPromptOptions } from '../../../../types';
import { ConnectionValidator } from '../../../connectionValidator';
import { getCFDiscoverPrompts } from '../abap-on-btp/questions';
import { getSystemServiceQuestion } from '../service-selection/questions';
import type { ServiceAnswer } from '../service-selection/types';

/**
 * Cloud Foundry ABAP system prompts specifically for BAS environment since it requires additional destination configuration.
 * These will call out to cf tools to discover the available abap systems and services, and create a new destination if necessary,
 * to allow apps to access these cf hosted services.
 *
 * @param promptOptions prompt options to control some prompt behavior see {@link ServiceSelectionPromptOptions}
 * @returns the prompt questions
 */
export function getCfAbapBASQuestions(
    promptOptions?: Partial<{
        serviceSelection: ServiceSelectionPromptOptions;
        valueHelpDownload: ValueHelpDownloadPromptOptions;
    }>
): Question<ServiceAnswer>[] {
    // Using a prompt namespace allows re-use of system service (catalog based) selection prompt
    const cfAbapBasPromptNamespace = 'cfAbapBas';
    const connectionValidator = new ConnectionValidator();
    return [
        ...getCFDiscoverPrompts(
            connectionValidator,
            cfAbapBasPromptNamespace,
            promptOptions?.serviceSelection?.requiredOdataVersion
        ),
        ...getSystemServiceQuestion(connectionValidator, cfAbapBasPromptNamespace, promptOptions)
    ];
}
