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
 * @param targetPath the target directory path.
 * @param appName the application directory name.
 * @param validateFioriAppFolder if true, validates the target path as a Fiori App project.
 * @returns true if validated for Fiori App Project and Project Folder, false if appName length is less than 2. Otherwise appropriate validation message.
 */
export async function validateTargetFolderForFioriApp(
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
