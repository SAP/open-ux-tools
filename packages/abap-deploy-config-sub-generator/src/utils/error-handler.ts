import { ErrorHandler, ERROR_TYPE, handleErrorMessage } from '@sap-ux/deploy-config-generator-shared';
import type { AppWizard } from '@sap-devx/yeoman-ui-types';

/**
 * Handle the case where the project does not exist.
 *
 * @param appWizard - the appWizard instance
 * @param path - the path that does not exist
 */
export function handleProjectDoesNotExist(appWizard: AppWizard, path: string): void {
    const errorMsg = ErrorHandler.fileDoesNotExist(path);
    handleErrorMessage(appWizard, { errorMsg });
    throw ERROR_TYPE.ABORT_SIGNAL;
}
