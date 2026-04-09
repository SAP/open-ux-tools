import { jest } from '@jest/globals';
import type { AppWizard } from '@sap-devx/yeoman-ui-types';

const mockGetHostEnvironment = jest.fn();
const mockDefaultLogger = {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn()
};

jest.unstable_mockModule('@sap-ux/fiori-generator-shared', () => ({
    getHostEnvironment: mockGetHostEnvironment,
    hostEnvironment: {
        vscode: { name: 'Visual Studio Code', technical: 'VSCode' },
        bas: { name: 'SAP Business Application Studio', technical: 'SBAS' },
        cli: { name: 'CLI', technical: 'CLI' }
    },
    DefaultLogger: mockDefaultLogger,
    LogWrapper: class {}
}));

const { ErrorHandler, ERROR_TYPE, bail, handleErrorMessage } = await import('../src/utils/error-handler');
const { DeploymentGenerator } = await import('../src/base/generator');
const { hostEnvironment } = await import('@sap-ux/fiori-generator-shared');
const { MessageType } = await import('@sap-devx/yeoman-ui-types');
const { t } = await import('../src/utils/i18n');
const { cdsExecutable, cdsPkg, mtaExecutable, mtaPkg } = await import('../src/utils/constants');

describe('bail', () => {
    it('should throw an error with the provided message', () => {
        const errorMessage = 'Test error';
        expect(() => bail(errorMessage)).toThrow(new Error(errorMessage));
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

    it('noBaseConfig should return the correct error message', () => {
        const baseConfig = 'mockConfig.yaml';
        const result = ErrorHandler.noBaseConfig(baseConfig);
        expect(result).toBe(t('errors.noBaseConfig', { baseConfig }));
    });

    it('should return correct error message for each error type', () => {
        expect(ErrorHandler.getErrorMsgFromType(ERROR_TYPE.ABORT_SIGNAL)).toBe(t('errors.abortSignal'));
        expect(ErrorHandler.getErrorMsgFromType(ERROR_TYPE.NO_MANIFEST)).toBe(t('errors.noManifest'));
        expect(ErrorHandler.getErrorMsgFromType(ERROR_TYPE.NO_APP_NAME)).toBe(t('errors.noAppName'));
        expect(ErrorHandler.getErrorMsgFromType(ERROR_TYPE.NO_CDS_BIN)).toBe(
            t('errors.noBinary', { bin: cdsExecutable, pkg: cdsPkg })
        );
        expect(ErrorHandler.getErrorMsgFromType(ERROR_TYPE.NO_MTA_BIN)).toBe(
            t('errors.noBinary', { bin: mtaExecutable, pkg: mtaPkg })
        );
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
        mockGetHostEnvironment.mockReturnValue(hostEnvironment.cli);

        expect(() => handleErrorMessage(appWizardMock, { errorType: ERROR_TYPE.ABORT_SIGNAL })).toThrow(expectedErrMsg);
    });

    it('should log error and call appWizard.showError if environment is not CLI', () => {
        const debugSpy = jest.spyOn(DeploymentGenerator.logger, 'debug');
        const expectedErrMsg = ErrorHandler.getErrorMsgFromType(ERROR_TYPE.NO_MANIFEST);
        mockGetHostEnvironment.mockReturnValue(hostEnvironment.vscode);

        handleErrorMessage(appWizardMock, { errorType: ERROR_TYPE.NO_MANIFEST });

        expect(debugSpy).toHaveBeenCalledWith(expectedErrMsg);
        expect(appWizardMock.showError).toHaveBeenCalledWith(expectedErrMsg, MessageType.notification);
    });
});
