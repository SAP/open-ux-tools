import { getCapProjectType } from '@sap-ux/project-access';
import { resolve, isAbsolute } from 'node:path';
import { t } from '../../../i18n';

/**
 * Context-aware path resolution for CAP project paths
 * Handles both absolute and relative paths by resolving relative paths against process.cwd()
 *
 * @param inputPath - The input path (can be relative or absolute)
 * @returns Resolved absolute path
 */
function resolveCapProjectPath(inputPath: string): string {
    if (isAbsolute(inputPath)) {
        return inputPath;
    }

    return resolve(process.cwd(), inputPath);
}

/**
 * Ensure the path specified is a valid CAP project.
 * Now supports relative paths like "../my-cap-project" by resolving them properly.
 *
 * @param capProjectPath - The path to the CAP project (can be relative or absolute)
 * @returns A boolean indicating if the path is a valid CAP project or an error message
 */
export async function validateCapPath(capProjectPath: string): Promise<boolean | string> {
    // Handle undefined/null case (when validate is called without parameters) - return false for backwards compatibility
    if (capProjectPath === undefined || capProjectPath === null) {
        return false;
    }

    // Empty path after filter means auto-detection failed or not in CLI mode
    if (capProjectPath.trim() === '') {
        return t('prompts.validationMessages.capProjectNotFound');
    }

    try {
        // Path should already be resolved by filter, but resolve relative paths just in case
        const resolvedPath = resolveCapProjectPath(capProjectPath.trim());

        // Validate the resolved path
        const capProjectType = await getCapProjectType(resolvedPath);

        if (capProjectType) {
            return true;
        } else {
            return t('prompts.validationMessages.capProjectNotFound');
        }
    } catch (err) {
        // Provide more specific error message for common issues
        const errorMessage = err instanceof Error ? err.message : String(err);

        if (errorMessage.includes('ENOENT') || errorMessage.includes('no such file or directory')) {
            return t('prompts.validationMessages.capProjectNotFound');
        } else if (errorMessage.includes('EACCES') || errorMessage.includes('permission denied')) {
            return t('prompts.validationMessages.permissionDenied');
        } else {
            return t('prompts.validationMessages.capProjectNotFound');
        }
    }
}
