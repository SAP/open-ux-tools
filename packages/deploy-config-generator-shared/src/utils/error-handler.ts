import { getHostEnvironment, hostEnvironment } from '@sap-ux/fiori-generator-shared';
import { DeploymentGenerator } from '../base/generator';
import { t } from './i18n';
import { cdsExecutable, cdsPkg, mtaExecutable, mtaPkg, mtaYaml } from './constants';
import { MessageType, type AppWizard } from '@sap-devx/yeoman-ui-types';

export enum ERROR_TYPE {
    ABORT_SIGNAL = 'ABORT_SIGNAL',
    NO_MANIFEST = 'NO_MANIFEST',
    NO_APP_NAME = 'NO_APP_NAME',
    NO_UI5_CONFIG = 'NO_UI5_CONFIG',
    NO_CDS_BIN = 'NO_CDS_BIN',
    NO_MTA_BIN = 'NO_MTA_BIN',
    NO_MTA = 'NO_MTA',
    NO_PATH = 'NO_PATH',
    NO_MTA_ID = 'NO_MTA_ID',
    INVALID_MTA_ID = 'INVALID_MTA_ID',
    CAP_DEPLOYMENT_NO_MTA = 'CAP_DEPLOYMENT_NO_MTA'
}

/**
 * Error messages for the deploy configuration generator.
 */
export class ErrorHandler {
    static cannotFindBinary = (bin: string, pkg: string): string => t('errors.noBinary', { bin, pkg });

    /**
     * Get the error message for the specified error type.
     *
     * @param errorType The error type for which the message may be returned
     * @returns The error message for the specified error type
     */
    public static getErrorMsgFromType(errorType?: ERROR_TYPE): string {
        if (errorType) {
            return ErrorHandler._errorTypeToMsg[errorType]();
        }
        return 'unknown error';
    }

    private static readonly _errorTypeToMsg: Record<ERROR_TYPE, () => string> = {
        [ERROR_TYPE.ABORT_SIGNAL]: () => t('errors.abortSignal'),
        [ERROR_TYPE.NO_MANIFEST]: () => t('errors.noManifest'),
        [ERROR_TYPE.NO_APP_NAME]: () => t('errors.noAppName'),
        [ERROR_TYPE.NO_UI5_CONFIG]: () => t('errors.noUi5Config'),
        [ERROR_TYPE.NO_CDS_BIN]: () => ErrorHandler.cannotFindBinary(cdsExecutable, cdsPkg),
        [ERROR_TYPE.NO_MTA_BIN]: () => ErrorHandler.cannotFindBinary(mtaExecutable, mtaPkg),
        [ERROR_TYPE.NO_MTA]: () => t('errors.noMta'),
        [ERROR_TYPE.NO_PATH]: () => t('errors.noPath'),
        [ERROR_TYPE.NO_MTA_ID]: () => t('errors.noMtaId'),
        [ERROR_TYPE.INVALID_MTA_ID]: () => t('errors.invalidMtaId'),
        [ERROR_TYPE.CAP_DEPLOYMENT_NO_MTA]: () => t('errors.capDeploymentNoMta')
    };

    public static readonly mtaIdAlreadyExist = (destinationRoot: string): string =>
        t('errors.mtaIdAlreadyExists', { destinationRoot });
    public static readonly noMtaInRoot = (root: string): string =>
        t('errors.noMtaInRoot', { mtaFileName: mtaYaml, root });
    public static readonly unrecognizedTarget = (target: string): string => t('errors.unrecognizedTarget', { target });
    public static readonly cannotReadUi5Config = (reason: string): string =>
        t('errors.cannotReadUi5Config', { reason });
    public static readonly fileDoesNotExist = (filePath: string): string => t('errors.fileDoesNotExist', { filePath });
    public static readonly folderDoesNotExist = (filePath: string): string =>
        t('errors.folderDoesNotExist', { filePath });
    public static readonly invalidClient = (client: string): string => t('errors.invalidClient', { client });
    public static readonly invalidURL = (input: string): string => t('errors.invalidURL', { input });
}

/**
 * Bail out with an error message.
 *
 * @param errorMessage - Error message to be displayed
 */
export function bail(errorMessage: string): void {
    throw new Error(errorMessage);
}

/**
 * Handle error message, display it in the UI or throws an error in CLI.
 *
 * @param appWizard - AppWizard instance
 * @param error - error type or message
 * @param error.errorType - error type
 * @param error.errorMsg - error message
 */
export function handleErrorMessage(
    appWizard: AppWizard,
    { errorType, errorMsg }: { errorType?: ERROR_TYPE; errorMsg?: string }
): void {
    const error = errorMsg ?? ErrorHandler.getErrorMsgFromType(errorType);
    if (getHostEnvironment() === hostEnvironment.cli) {
        bail(error);
    } else {
        DeploymentGenerator.logger?.debug(error);
        appWizard?.showError(error, MessageType.notification);
    }
}
