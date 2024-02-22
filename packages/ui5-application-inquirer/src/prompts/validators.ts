import { validateModuleName } from '@sap-ux/project-input-validator';
import { appPathExists } from './prompt-helpers';
import { t } from '../i18n';

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
