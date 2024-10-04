import type { CfDeployConfigAnswers } from '../types';

/**
 * Determines if the destination question should be shown based on the target configuration.
 *
 * @param {Answers} previousAnswers - The answers provided in previous prompts.
 * @returns {boolean} `true` if the target is Cloud Foundry or not yet defined, otherwise `false`.
 */
export function showDestinationQuestion(previousAnswers: CfDeployConfigAnswers): boolean {
    return previousAnswers.targetName === undefined || previousAnswers.targetName === 'cf';
}

/**
 * Determines whether to show the managed application router question based on the following conditions:
 * - The target is Cloud Foundry.
 * - No mta yaml configuration is found at the given path.
 * - The project is not a CAP project.
 *
 * @param mtaYamlExists
 * @param {Answers} previousAnswers - The answers provided in previous prompts.
 * @param {boolean} isCapProject - Indicates if the project is a CAP project.
 * @returns {Promise<boolean>} A promise that resolves to `true` if the question should be shown, otherwise `false`.
 */
export async function showManagedAppRouterQuestion(
    mtaYamlExists: boolean,
    previousAnswers: CfDeployConfigAnswers,
    isCapProject: boolean
): Promise<boolean> {
    return showDestinationQuestion(previousAnswers) && !mtaYamlExists && !isCapProject;
}
