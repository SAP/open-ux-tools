import { validateModuleName } from '@sap-ux/project-input-validator';
import { appPathExists } from './prompt-helpers';
import { t } from '../i18n';
import { findRootsForPath, findCapProjectRoot, getCapProjectType } from '@sap-ux/project-access';
/**
 * Returns true (valid) if the specified projectName is a valid module name
 * and if an application folder (directory) at the specified path does not exist.
 *
 * @param appName the application directory name that would contain a UI5 application
 * @param targetDir the directory path where the directory named `appName` would be created
 * @returns true, if valid, or a string message indicating the reason why the input is invalid
 */
export function validateAppName(appName: string, targetDir: string): boolean | string {
    const nameValidationResult = validateModuleName(appName);
    if (nameValidationResult !== true) {
        return nameValidationResult;
    }

    const existing = appPathExists(appName, targetDir);
    if (existing) {
        return t('validators.appFolderExistsAtPath', { path: targetDir });
    }
    return true;
}

/**
 * Returns true if the specified target path does not contain a Fiori project.
 *
 * @param targetDir the target directory path.
 * @returns true, if not Fiori Project, or string message indicating that the path contains a Fiori project.
 */
export async function validateFioriAppProjectFolder(targetDir: string): Promise<string | boolean> {
    const appRoot = await findRootsForPath(targetDir);
    if (appRoot) {
        return t('validators.folderContainsFioriApp', { path: appRoot.appRoot });
    }
    if (!!(await findCapProjectRoot(targetDir, false)) || !!(await getCapProjectType(targetDir))) {
        return t('validators.folderContainsCapApp');
    } else {
        return true;
    }
}
