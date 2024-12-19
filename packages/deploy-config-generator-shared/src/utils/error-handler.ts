import { getHostEnvironment, hostEnvironment } from '@sap-ux/fiori-generator-shared';
import { DeploymentGenerator } from '../base/generator';
import { t } from './i18n';
import { cdsExecutable, cdsPkg, mtaExecutable, mtaPkg, mtaYaml } from './constants';
import { MessageType, type AppWizard } from '@sap-devx/yeoman-ui-types';

/**
 * Error messages for the deploy configuration generator.
 */
export class ErrorMessages {
    private static readonly cannotFindBinary = (bin: string, pkg: string): string => t('errors.noBinary', { bin, pkg });

    public static readonly abortSignal = t('errors.abortSignal');
    public static readonly noManifest = t('errors.noManifest');
    public static readonly noAppName = t('errors.noAppName');
    public static readonly noUI5Config = t('errors.noUi5Config');
    public static readonly noCdsBin = this.cannotFindBinary(cdsExecutable, cdsPkg);
    public static readonly noMtaBin = this.cannotFindBinary(mtaExecutable, mtaPkg);
    public static readonly noMta = t('errors.noMta');
    public static readonly noPath = t('errors.noPath');
    public static readonly noMtaId = t('errors.noMtaId');
    public static readonly invalidMtaId = t('errors.invalidMtaId');
    public static readonly capDeploymentnoMta = t('errors.capDeploymentNoMta');

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
 * @param errorMsg - Error message to be displayed
 */
export function handleErrorMessage(appWizard: AppWizard, errorMsg: string): void {
    if (getHostEnvironment() === hostEnvironment.cli) {
        bail(errorMsg);
    } else {
        DeploymentGenerator.logger?.debug(errorMsg);
        appWizard?.showError(errorMsg, MessageType.notification);
    }
}
