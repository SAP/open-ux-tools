import { getQuestions } from './prompts';
import type { CfDeployConfigPromptOptions, CfDeployConfigQuestions } from './types';
import { initI18nCfDeployConfigInquirer } from './i18n';

/**
 * Retrieves Cloud Foundry deployment configuration prompts.
 *
 * This function returns a list of cf deployment questions based on the provided application root and prompt options.
 *
 * @param {string} appRoot - The root directory of the application.
 * @param {CfDeployConfigPromptOptions} promptOptions - The configuration options for prompting during cf target deployment.
 * @returns {Promise<CfDeployConfigQuestions[]>} A promise that resolves to an array of questions for cf target prompting.
 */
async function getPrompts(
    appRoot: string,
    promptOptions: CfDeployConfigPromptOptions
): Promise<CfDeployConfigQuestions[]> {
    await initI18nCfDeployConfigInquirer();
    return getQuestions(appRoot, promptOptions);
}

export { getPrompts, CfDeployConfigPromptOptions };
