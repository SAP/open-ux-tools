/**
 * Determines whether to show the managed application router question based on the following conditions:
 * - The target is Cloud Foundry.
 * - No mta yaml configuration is found at the given path.
 * - The project is not a CAP project.
 *
 * @param mtaYamlExists
 * @param {boolean} isCapProject - Indicates if the project is a CAP project.
 * @returns {boolean} Resolves to `true` if the question should be shown, otherwise `false`.
 */
export function showManagedAppRouterQuestion(mtaYamlExists: boolean, isCapProject: boolean): boolean {
    return !mtaYamlExists && !isCapProject;
}

/**
 * Determines whether to show the overwrite question based on addOverwriteQuestions:
 *
 * @param {boolean} addOverwriteQuestions - Indicates whether the overwrite question should be shown.
 * @returns {boolean} `true` if the overwrite question should be shown, otherwise `false`.
 */
export function showOverwriteQuestion(addOverwriteQuestions: boolean): boolean {
    if (addOverwriteQuestions) {
        return true;
    }
    return false;
}
