import { getService, BackendSystem, SystemType } from '@sap-ux/store';
import { SystemLookup } from '@sap-ux/adp-tooling';
import type { ToolsLogger } from '@sap-ux/logger';
import { storeCredentials } from '../../src/app/credential-storage';

jest.mock('@sap-ux/store');
jest.mock('@sap-ux/adp-tooling');

describe('Credential Storage Logic', () => {
    let mockSystemService: any;
    let mockLogger: ToolsLogger;
    let mockSystemLookup: SystemLookup;
    const getServiceMock = getService as jest.Mock;

    beforeEach(() => {
        mockSystemService = {
            read: jest.fn(),
            write: jest.fn()
        };

        mockLogger = {
            debug: jest.fn(),
            info: jest.fn(),
            warn: jest.fn(),
            error: jest.fn()
        } as any;

        mockSystemLookup = {
            getSystemByName: jest.fn()
        } as any;

        getServiceMock.mockResolvedValue(mockSystemService);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('storeCredentials function', () => {
        it('should store credentials when storeCredentials is true and credentials are provided', async () => {
            const configAnswers = {
                storeCredentials: true,
                system: 'SystemA',
                username: 'user1',
                password: 'pass1'
            };

            (mockSystemLookup.getSystemByName as jest.Mock).mockResolvedValue({
                Name: 'SystemA',
                Client: '010',
                Url: 'https://example.com',
                SystemType: 'OnPrem'
            });

            mockSystemService.read.mockResolvedValue(null);

            await storeCredentials(configAnswers, mockSystemLookup, mockLogger);

            expect(getServiceMock).toHaveBeenCalledWith({ entityName: 'system' });
            expect(mockSystemService.read).toHaveBeenCalled();
            expect(mockSystemService.write).toHaveBeenCalledWith(
                expect.any(Object),
                { force: false }
            );
            expect(mockLogger.info).toHaveBeenCalledWith('System credentials have been stored securely.');
        });

        it('should update existing credentials when system already exists in store', async () => {
            const configAnswers = {
                storeCredentials: true,
                system: 'SystemA',
                username: 'user1',
                password: 'pass1'
            };

            (mockSystemLookup.getSystemByName as jest.Mock).mockResolvedValue({
                Name: 'SystemA',
                Client: '010',
                Url: 'https://example.com',
                SystemType: 'OnPrem'
            });

            mockSystemService.read.mockResolvedValue({ name: 'SystemA', url: 'https://example.com' });

            await storeCredentials(configAnswers, mockSystemLookup, mockLogger);

            expect(mockSystemService.write).toHaveBeenCalledWith(
                expect.any(Object),
                { force: true }
            );
            expect(mockLogger.info).toHaveBeenCalledWith('System credentials have been stored securely.');
        });

        it('should not store credentials when storeCredentials is false', async () => {
            const configAnswers = {
                storeCredentials: false,
                system: 'SystemA',
                username: 'user1',
                password: 'pass1'
            };

            await storeCredentials(configAnswers, mockSystemLookup, mockLogger);

            expect(getServiceMock).not.toHaveBeenCalled();
            expect(mockSystemService.write).not.toHaveBeenCalled();
        });

        it('should not store credentials when username is missing', async () => {
            const configAnswers = {
                storeCredentials: true,
                system: 'SystemA',
                username: undefined,
                password: 'pass1'
            };

            await storeCredentials(configAnswers, mockSystemLookup, mockLogger);

            expect(getServiceMock).not.toHaveBeenCalled();
            expect(mockSystemService.write).not.toHaveBeenCalled();
        });

        it('should not store credentials when password is missing', async () => {
            const configAnswers = {
                storeCredentials: true,
                system: 'SystemA',
                username: 'user1',
                password: undefined
            };

            await storeCredentials(configAnswers, mockSystemLookup, mockLogger);

            expect(getServiceMock).not.toHaveBeenCalled();
            expect(mockSystemService.write).not.toHaveBeenCalled();
        });

        it('should warn when system endpoint is not found', async () => {
            const configAnswers = {
                storeCredentials: true,
                system: 'SystemA',
                username: 'user1',
                password: 'pass1'
            };

            (mockSystemLookup.getSystemByName as jest.Mock).mockResolvedValue(undefined);

            await storeCredentials(configAnswers, mockSystemLookup, mockLogger);

            expect(mockLogger.warn).toHaveBeenCalledWith(
                'Cannot store credentials: system endpoint or URL not found.'
            );
            expect(mockSystemService.write).not.toHaveBeenCalled();
        });

        it('should warn when system URL is missing', async () => {
            const configAnswers = {
                storeCredentials: true,
                system: 'SystemA',
                username: 'user1',
                password: 'pass1'
            };

            (mockSystemLookup.getSystemByName as jest.Mock).mockResolvedValue({
                Name: 'SystemA',
                Client: '010',
                Url: ''
            });

            await storeCredentials(configAnswers, mockSystemLookup, mockLogger);

            expect(mockLogger.warn).toHaveBeenCalledWith(
                'Cannot store credentials: system endpoint or URL not found.'
            );
            expect(mockSystemService.write).not.toHaveBeenCalled();
        });

        it('should handle credential storage errors gracefully', async () => {
            const configAnswers = {
                storeCredentials: true,
                system: 'SystemA',
                username: 'user1',
                password: 'pass1'
            };

            (mockSystemLookup.getSystemByName as jest.Mock).mockResolvedValue({
                Name: 'SystemA',
                Client: '010',
                Url: 'https://example.com',
                SystemType: 'OnPrem'
            });

            const error = new Error('Storage failed');
            mockSystemService.write.mockRejectedValue(error);

            await storeCredentials(configAnswers, mockSystemLookup, mockLogger);

            expect(mockLogger.warn).toHaveBeenCalledWith('Failed to store credentials: Storage failed');
        });

        it('should handle non-Error exceptions when storing credentials', async () => {
            const configAnswers = {
                storeCredentials: true,
                system: 'SystemA',
                username: 'user1',
                password: 'pass1'
            };

            (mockSystemLookup.getSystemByName as jest.Mock).mockResolvedValue({
                Name: 'SystemA',
                Client: '010',
                Url: 'https://example.com',
                SystemType: 'OnPrem'
            });

            mockSystemService.write.mockRejectedValue('String error');

            await storeCredentials(configAnswers, mockSystemLookup, mockLogger);

            expect(mockLogger.warn).toHaveBeenCalledWith('Failed to store credentials: String error');
        });
    });
});
