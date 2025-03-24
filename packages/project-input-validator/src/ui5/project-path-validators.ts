import { findRootsForPath, findCapProjectRoot, getCapProjectType } from '@sap-ux/project-access';
import { validateProjectFolder } from './validators';
import { t } from '../i18n';
/**
 * Returns true if the specified target path does not contain a Fiori project.
 *
 * @param targetDir the target directory path.
 * @returns true, if not Fiori Project, or string message indicating that the path contains a Fiori project.
 */
async function validateFioriAppProjectFolder(targetDir: string): Promise<string | boolean> {
    // Check if the target directory contains a CAP project
    if (!!(await findCapProjectRoot(targetDir, false)) || !!(await getCapProjectType(targetDir))) {
        return t('ui5.folderContainsCapApp');
    }
    // Check if the target directory contains a Fiori project
    const appRoot = await findRootsForPath(targetDir);
    if (appRoot) {
        return t('ui5.folderContainsFioriApp', { path: appRoot.appRoot });
    } else {
        return true;
    }
}

/**
 * Validates the provided target path as a Fiori App project folder.
 *
 * @param {string} targetPath - The target directory path where the Fiori App project is to be generated.
 * @param {string} appName - The application name.
 * @param {boolean} [validateFioriAppFolder] - If true, performs additional validation to check
 *        if the target path is a valid Fiori App project folder.
 * @returns {Promise<string | boolean>} - Returns `true` if all validations pass successfully.
 *        If a validation fails, returns an appropriate validation message as a string.
 */
export async function validateFioriAppTargetFolder(
    targetPath: string,
    appName: string,
    validateFioriAppFolder?: boolean
): Promise<string | boolean> {
    if (validateFioriAppFolder === true) {
        const isFioriValid = await validateFioriAppProjectFolder(targetPath);
        if (isFioriValid !== true) {
            return isFioriValid;
        }
    }
    const isProjectValid = validateProjectFolder(targetPath, appName);
    if (isProjectValid !== true) {
        return isProjectValid;
    }
    return true;
}
