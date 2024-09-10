import { latestVersionString } from '@sap-ux/ui5-info';
import { existsSync } from 'fs';
import { join } from 'path';
import { coerce, gte } from 'semver';
import { defaultProjectNumber, t } from '../i18n';
import { promptNames, type UI5ApplicationPromptOptions, type UI5ApplicationQuestion } from '../types';
import { validateProjectFolder } from '@sap-ux/project-input-validator';
import { validateFioriAppProjectFolder } from './validators';

/**
 * Tests if a directory with the specified `appName` exists at the path specified by `targetPath`.
 *
 * @param appName directory name of application
 * @param targetPath directory path where application directory would be created
 * @returns true, if the combined path exists otherwise false
 */
export function appPathExists(appName: string, targetPath?: string): boolean | string {
    return existsSync(join(targetPath ?? process.cwd(), appName.trim()));
}
/**
 * Generate a default applicaiton name that does not exist at the specified path.
 *
 * @param targetPath the target path where the application directory would be created
 * @returns a suggested application name that can be created at the specified target path
 */
export function defaultAppName(targetPath: string): string {
    let defProjNum = defaultProjectNumber;
    let defaultName = t('prompts.appNameDefault');
    while (exports.appPathExists(`${defaultName}`, targetPath)) {
        defaultName = t('prompts.appNameDefault', { defaultProjectNumber: ++defProjNum });
        // Dont loop forever, user will need to provide input otherwise
        if (defProjNum > 999) {
            break;
        }
    }
    return defaultName;
}

/**
 * Checks if the specified semantic version string is greater than or equal to the minimum version.
 * If the specified version is not a parsable semantic version, returns true.
 *
 * @param version the version to test
 * @param minVersion the minimum version to test against
 * @returns - true if the specified version is greater than or equal to the minimum version, or the version is not a coercible semver
 */
export function isVersionIncluded(version: string, minVersion: string): boolean {
    // Extract a usable version, `snapshot`, `latest` etc will be ignored
    const ui5SemVer = coerce(version);
    if (ui5SemVer) {
        return gte(ui5SemVer, minVersion);
    }
    return version === latestVersionString;
}

/**
 * Will remove prompts from the specified prompts based on prompt options
 * and applicability in the case of CAP projects. Removing prompts is preferable to using `when()`
 * conditions when prompts are used in a UI to prevent continuous re-evaluation.
 *
 * @param prompts Keyed prompts object containing all possible prompts
 * @param promptOptions prompt options
 * @param isCapProject if we are generating into a CAP project certain prompts may be removed
 * @returns the updated questions
 */
export function hidePrompts(
    prompts: Record<promptNames, UI5ApplicationQuestion>,
    promptOptions?: UI5ApplicationPromptOptions,
    isCapProject?: boolean
): UI5ApplicationQuestion[] {
    const questions: UI5ApplicationQuestion[] = [];
    if (promptOptions ?? isCapProject) {
        Object.keys(prompts).forEach((key) => {
            const promptKey = key as keyof typeof promptNames;
            if (
                !promptOptions?.[promptKey]?.hide &&
                // Target directory is determined by the CAP project. `enableEsLint` and `targetFolder` are not available for CAP projects
                !([promptNames.targetFolder, promptNames.enableEslint].includes(promptNames[promptKey]) && isCapProject)
            ) {
                questions.push(prompts[promptKey]);
            }
        });
    } else {
        questions.push(...Object.values(prompts));
    }
    return questions;
}

/**
 * @param targetPath the target directory path.
 * @param appName the application directory name.
 * @returns true if validated for Fiori App Project and Project Folder, false if appName length is less than 2. Otherwise appropriate validation message.
 */
export async function validateTargetFolder(targetPath: string, appName: string): Promise<string | boolean> {
    if (appName.length <= 2) {
        return false;
    }
    const isFioriValid = await validateFioriAppProjectFolder(targetPath);
    const isProjectValid = validateProjectFolder(targetPath, appName);
    if (isFioriValid !== true) {
        return isFioriValid;
    }
    if (isProjectValid !== true) {
        return isProjectValid;
    }
    return true;
}
