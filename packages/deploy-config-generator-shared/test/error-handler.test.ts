import { DeploymentGenerator } from '../src/base/generator';
import { bail, ErrorMessages, handleErrorMessage } from '../src/utils/error-handler';
import { getHostEnvironment, hostEnvironment } from '@sap-ux/fiori-generator-shared';
import { MessageType, type AppWizard } from '@sap-devx/yeoman-ui-types';
import { t } from '../src/utils/i18n';

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
    it('mtaIdAlreadyExist should return the correct error message', () => {
        const destinationRoot = '/path/to/destination';
        const result = ErrorMessages.mtaIdAlreadyExist(destinationRoot);
        expect(result).toBe(t('errors.mtaIdAlreadyExists', { destinationRoot }));
    });

    it('noMtaInRoot should return the correct error message', () => {
        const root = '/path/to/root';
        const mtaYaml = 'mta.yaml';
        const result = ErrorMessages.noMtaInRoot(root);
        expect(result).toBe(t('errors.noMtaInRoot', { mtaFileName: mtaYaml, root }));
    });

    it('unrecognizedTarget should return the correct error message', () => {
        const target = 'unknownTarget';
        const result = ErrorMessages.unrecognizedTarget(target);
        expect(result).toBe(t('errors.unrecognizedTarget', { target }));
    });

    it('cannotReadUi5Config should return the correct error message', () => {
        const reason = 'Permission denied';
        const result = ErrorMessages.cannotReadUi5Config(reason);
        expect(result).toBe(t('errors.cannotReadUi5Config', { reason }));
    });

    it('fileDoesNotExist should return the correct error message', () => {
        const filePath = '/path/to/file';
        const result = ErrorMessages.fileDoesNotExist(filePath);
        expect(result).toBe(t('errors.fileDoesNotExist', { filePath }));
    });

    it('folderDoesNotExist should return the correct error message', () => {
        const filePath = '/path/to/folder';
        const result = ErrorMessages.folderDoesNotExist(filePath);
        expect(result).toBe(t('errors.folderDoesNotExist', { filePath }));
    });

    it('invalidClient should return the correct error message', () => {
        const client = '12345';
        const result = ErrorMessages.invalidClient(client);
        expect(result).toBe(t('errors.invalidClient', { client }));
    });

    it('invalidURL should return the correct error message', () => {
        const input = 'http://invalid.url';
        const result = ErrorMessages.invalidURL(input);
        expect(result).toBe(t('errors.invalidURL', { input }));
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
        const errorMessage = 'CLI error';
        (getHostEnvironment as jest.Mock).mockReturnValue(hostEnvironment.cli);

        expect(() => handleErrorMessage(appWizardMock, errorMessage)).toThrowError(new Error(errorMessage));
    });

    it('should log error and call appWizard.showError if environment is not CLI', () => {
        const debugSpy = jest.spyOn(DeploymentGenerator.logger, 'debug');
        const errorMessage = 'UI error';
        (getHostEnvironment as jest.Mock).mockReturnValue(hostEnvironment.vscode);

        handleErrorMessage(appWizardMock, errorMessage);

        expect(debugSpy).toHaveBeenCalledWith(errorMessage);
        expect(appWizardMock.showError).toHaveBeenCalledWith(errorMessage, MessageType.notification);
    });
});
