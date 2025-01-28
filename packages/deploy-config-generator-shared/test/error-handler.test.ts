import { DeploymentGenerator, bail, handleErrorMessage, ErrorHandler, ERROR_TYPE } from '../src';
import { getHostEnvironment, hostEnvironment } from '@sap-ux/fiori-generator-shared';
import { MessageType, type AppWizard } from '@sap-devx/yeoman-ui-types';
import { t } from '../src/utils/i18n';
import { cdsExecutable, cdsPkg, mtaExecutable, mtaPkg } from '../src/utils/constants';

jest.mock('@sap-ux/fiori-generator-shared', () => ({
    ...jest.requireActual('@sap-ux/fiori-generator-shared'),
    getHostEnvironment: jest.fn()
}));

describe('bail', () => {
    it('should throw an error with the provided message', () => {
        const errorMessage = 'Test error';
        expect(() => bail(errorMessage)).toThrowError(new Error(errorMessage));
    });
});

describe('Error Message Methods', () => {
    it('unrecognizedTarget should return the correct error message', () => {
        const target = 'unknownTarget';
        const result = ErrorHandler.unrecognizedTarget(target);
        expect(result).toBe(t('errors.unrecognizedTarget', { target }));
    });

    it('fileDoesNotExist should return the correct error message', () => {
        const filePath = '/path/to/file';
        const result = ErrorHandler.fileDoesNotExist(filePath);
        expect(result).toBe(t('errors.fileDoesNotExist', { filePath }));
    });

    it('folderDoesNotExist should return the correct error message', () => {
        const filePath = '/path/to/folder';
        const result = ErrorHandler.folderDoesNotExist(filePath);
        expect(result).toBe(t('errors.folderDoesNotExist', { filePath }));
    });

    it('should return correct error message for each error type', () => {
        expect(ErrorHandler.getErrorMsgFromType(ERROR_TYPE.ABORT_SIGNAL)).toBe(t('errors.abortSignal'));
        expect(ErrorHandler.getErrorMsgFromType(ERROR_TYPE.NO_MANIFEST)).toBe(t('errors.noManifest'));
        expect(ErrorHandler.getErrorMsgFromType(ERROR_TYPE.NO_APP_NAME)).toBe(t('errors.noAppName'));
        expect(ErrorHandler.getErrorMsgFromType(ERROR_TYPE.NO_UI5_CONFIG)).toBe(t('errors.noUi5Config'));
        expect(ErrorHandler.getErrorMsgFromType(ERROR_TYPE.NO_CDS_BIN)).toBe(
            t('errors.noBinary', { bin: cdsExecutable, pkg: cdsPkg })
        );
        expect(ErrorHandler.getErrorMsgFromType(ERROR_TYPE.NO_MTA_BIN)).toBe(
            t('errors.noBinary', { bin: mtaExecutable, pkg: mtaPkg })
        );
        expect(ErrorHandler.getErrorMsgFromType(ERROR_TYPE.CAP_DEPLOYMENT_NO_MTA)).toBe(t('errors.capDeploymentNoMta'));
    });
});

describe('handleErrorMessage', () => {
    let appWizardMock: AppWizard;

    beforeEach(() => {
        appWizardMock = {
            showError: jest.fn()
        } as unknown as AppWizard;
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('should call bail with error message if environment is CLI', () => {
        const expectedErrMsg = ErrorHandler.getErrorMsgFromType(ERROR_TYPE.ABORT_SIGNAL);
        (getHostEnvironment as jest.Mock).mockReturnValue(hostEnvironment.cli);

        expect(() => handleErrorMessage(appWizardMock, { errorType: ERROR_TYPE.ABORT_SIGNAL })).toThrowError(
            expectedErrMsg
        );
    });

    it('should log error and call appWizard.showError if environment is not CLI', () => {
        const debugSpy = jest.spyOn(DeploymentGenerator.logger, 'debug');
        const expectedErrMsg = ErrorHandler.getErrorMsgFromType(ERROR_TYPE.NO_MANIFEST);
        (getHostEnvironment as jest.Mock).mockReturnValue(hostEnvironment.vscode);

        handleErrorMessage(appWizardMock, { errorType: ERROR_TYPE.NO_MANIFEST });

        expect(debugSpy).toHaveBeenCalledWith(expectedErrMsg);
        expect(appWizardMock.showError).toHaveBeenCalledWith(expectedErrMsg, MessageType.notification);
    });
});
