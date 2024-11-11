import { AppWizard } from '@sap-devx/yeoman-ui-types';
import { ErrorMessages, handleErrorMessage } from '@sap-ux/deploy-config-generator-common';

export function handleProjectDoesNotExist(path: string, appWizard: AppWizard): void {
    const errorMsg = ErrorMessages.fileDoesNotExist(path);
    handleErrorMessage(appWizard, errorMsg);
    throw ErrorMessages.abortSignal; // needs to be tested
}
