import { t } from '../../../i18n';
import { getCapProjectType } from '@sap-ux/project-access';

/**
 * Ensure the path specified is a valid CAP project.
 *
 * @param capProjectPath - The path to the CAP project
 * @returns A boolean indicating if the path is a valid CAP project or an error message
 */
export async function validateCapPath(capProjectPath: string): Promise<boolean | string> {
    if (capProjectPath) {
        /* Should be taken care of by the project-access library 
        // Remove leading slash from windows selected folder if present.
        if (process.platform === 'win32' && capProjectPath.substring(0, 1) === '/') {
            capProjectPath = capProjectPath.substring(1);
        } */
        try {
            return !!(await getCapProjectType(capProjectPath)) || t('promps.validationMessages.capProjectNotFound');
        } catch (err) {
            return t('promps.validationMessages.capProjectNotFound');
        }
    }
    return false;
}
