import { type ConfirmQuestion, type InputQuestion, searchChoices } from '@sap-ux/inquirer-common';
import { t } from '../i18n';
import type {
    CfDeployConfigPromptOptions,
    CfDeployConfigQuestions,
    CfDeployConfigAnswers,
    DestinationNamePromptOptions,
    CfSystemChoice,
    CfAppRouterDeployConfigQuestions,
    CfAppRouterDeployConfigAnswers,
    CfAppRouterDeployConfigPromptOptions,
    MtaPathPromptOptions,
    MtaIdPromptOptions
} from '../types';
import { appRouterPromptNames } from '../types';
import { validateMtaPath } from './validators';
import type { Logger } from '@sap-ux/logger';


function getMtaPathPrompt(
    mtaPathPromptOptions: MtaPathPromptOptions
): CfAppRouterDeployConfigQuestions {
    return {
        type: 'input',
        guiOptions: {
            type: 'folder-browser',
            breadcrumb: t('prompts.mtaPathBreadcrumbMessage')
        },
        name: appRouterPromptNames.mtaPath,
        message: t('prompts.mtaPathMessage'),
        default: () => mtaPathPromptOptions.defaultValue,
        validate: (input: string): string | boolean => validateMtaPath(input)
    } as InputQuestion<CfAppRouterDeployConfigAnswers>;
}

function getMtaIdPrompt(
    mtaIdPromptOptions: MtaIdPromptOptions
): CfAppRouterDeployConfigQuestions {
    return {
        when: (): boolean => conditions.showMtaIdQuestion(generator),
        type: 'input',
        guiOptions: {
            mandatory: true,
            breadcrumb: true
        },
        name: appRouterPromptNames.mtaId,
        message: t('prompts.mtaIdMessage'),
        validate: (input: string, previousAnswers: CfAppRouterDeployConfigAnswers): boolean | string =>
            validators.validateMta(input, previousAnswers),
        filter: (input: string): string => input.replace(/\./g, '-')
    } as InputQuestion<CfAppRouterDeployConfigAnswers>;
}

/**
 * Retrieves a list of deployment questions based on the application root and prompt options.
 *
 * @param {CfDeployConfigPromptOptions} promptOptions - The configuration options for prompting during cf target deployment.
 * @param {Logger} [log] - The logger instance to use for logging.
 * @returns {CfAppRouterDeployConfigQuestions[]} Returns an array of questions related to cf deployment configuration.
 */
export async function getQuestions(
    promptOptions: CfAppRouterDeployConfigPromptOptions,
    log?: Logger
): Promise<CfAppRouterDeployConfigQuestions[]> {
    const mtaPromptOptions = promptOptions[appRouterPromptNames.mtaPath] as MtaPathPromptOptions;

    const questions: CfAppRouterDeployConfigQuestions[] = [];
    // Collect questions into an array
    questions.push(getMtaPathPrompt(mtaPromptOptions));
   
    return questions;
}
