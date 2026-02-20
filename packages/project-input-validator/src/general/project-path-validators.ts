import { findCapProjectRoot, findRootsForPath, getCapProjectType } from '@sap-ux/project-access';
import { join } from 'node:path';
import { t } from '../i18n';
import { validateProjectFolder } from '../ui5/validators';
import { validateWindowsPathLength } from './validators';

/**
 * Returns true if the specified target path does not contain an SAP Fiori project.
 *
 * @param targetDir the target directory path.
 * @returns true, if not Fiori Project, or string message indicating that the path contains an SAP Fiori project.
 */
export async function validateFioriAppProjectFolder(targetDir: string): Promise<string | boolean> {
    // Check if the target directory contains a CAP project
    if (!!(await findCapProjectRoot(targetDir, false)) || !!(await getCapProjectType(targetDir))) {
        return t('ui5.folderContainsCapApp');
    }
    // Check if the target directory contains an SAP Fiori project
    const appRoot = await findRootsForPath(targetDir);
    if (appRoot) {
        return t('ui5.folderContainsFioriApp', { path: appRoot.appRoot });
    } else {
        return true;
    }
}

/**
 * Validates whether the specified target path is suitable for creating an SAP Fiori project App project.
 * The function performs the following checks:
 *
 * 1. **CAP Project Check:** If `validateFioriAppFolder` is true, it checks if the target path is part of an existing CAP project.
 *    - Uses `findCapProjectRoot()` and `getCapProjectType()` to verify the presence of a CAP project.
 *    - Returns an error message if a CAP project is detected.
 *
 * 2. **Fiori App Project Check:** If `validateFioriAppFolder` is true, it checks if the target path contains an SAP Fiori project.
 *    - Uses `findRootsForPath()` to determine if an SAP Fiori project application root exists.
 *    - Returns a success message if a valid SAP Fiori app root is found, otherwise returns true.
 *
 * 3. **General Project Folder Check:**
 *    - Uses `validateProjectFolder()` to verify if the provided target path exists.
 *    - Ensures the target folder does not already contain a subfolder with the intended project name.
 *
 * 4. **Windows Path Length Validation:**
 *   - Validates the combined path length of the target directory and application name against the Windows max path length limit (256 characters).
 *
 * @param targetPath - The target directory path where the SAP Fiori app is to be created.
 * @param appName - The application directory name.
 * @param validateFioriAppFolder - If true, validates the target path as an SAP Fiori App project folder.
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
    const winPathResult = validateWindowsPathLength(join(targetPath, appName), t(`general.windowsFolderPathTooLong`));
    if (winPathResult !== true) {
        return winPathResult;
    }
    return true;
}
