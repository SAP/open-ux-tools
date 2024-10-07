/**
 * Determines whether to show the managed application router question based on the following conditions:
 * - The target is Cloud Foundry.
 * - No mta yaml configuration is found at the given path.
 * - The project is not a CAP project.
 *
 * @param {boolean} mtaYamlExists - Indicates whether an mta yaml file exists.
 * @param {boolean} isCapProject - Indicates if the project is a CAP project.
 * @returns {boolean} Resolves to `true` if the question should be shown, otherwise `false`.
 */
export function showManagedAppRouterQuestion(mtaYamlExists: boolean, isCapProject: boolean): boolean {
    return !mtaYamlExists && !isCapProject;
}
