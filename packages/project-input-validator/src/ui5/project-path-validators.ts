import { findRootsForPath, findCapProjectRoot, getCapProjectType } from '@sap-ux/project-access';
import { validateProjectFolder } from './validators';
import { t } from '../i18n';

/**
 * Checks if the combined Windows path length exceeds the default limit (256).
 *
 * @param basePath The base path (e.g., target folder or mtaPath)
 * @param id The name, id, or additional segment to append
 * @param tFunc The translation function to use for the error message
 * @param errorKey The translation key for the error message
 * @returns true if valid, or the error message if too long
 */
export function validateWindowsPathLength(
    basePath: string,
    id: string,
    tFunc: typeof t,
    errorKey: string
): true | string {
    if (process.platform === 'win32') {
        const combinedLength = `${basePath}\\${id}`.length;
        if (combinedLength >= 256) {
            return tFunc(errorKey, { length: combinedLength });
        }
    }
    return true;
}

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
 * Validates whether the specified target path is suitable for creating a Fiori App project.
 * The function performs the following checks:
 *
 * 1. **CAP Project Check:** If `validateFioriAppFolder` is true, it checks if the target path is part of an existing CAP project.
 *    - Uses `findCapProjectRoot()` and `getCapProjectType()` to verify the presence of a CAP project.
 *    - Returns an error message if a CAP project is detected.
 *
 * 2. **Fiori App Project Check:** If `validateFioriAppFolder` is true, it checks if the target path contains a Fiori project.
 *    - Uses `findRootsForPath()` to determine if a Fiori application root exists.
 *    - Returns a success message if a valid Fiori app root is found, otherwise returns true.
 *
 * 3. **General Project Folder Check:**
 *    - Uses `validateProjectFolder()` to verify if the provided target path exists.
 *    - Ensures the target folder does not already contain a subfolder with the intended project name.
 *
 * @param targetPath - The target directory path where the Fiori app is to be created.
 * @param appName - The application directory name.
 * @param validateFioriAppFolder - If true, validates the target path as a Fiori App project folder.
 * @returns A boolean value `true` if all validations pass; otherwise, an error message.
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
    // Windows path length validation
    const winPathResult = validateWindowsPathLength(targetPath, appName, t, 'general.windowsFolderPathTooLong');
    if (winPathResult !== true) {
        return winPathResult;
    }
    return true;
}
