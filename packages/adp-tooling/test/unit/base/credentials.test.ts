import { getService, SystemType } from '@sap-ux/store';
import { storeCredentials } from '../../../src';
import type { SystemLookup } from '../../../src';
import type { ToolsLogger } from '@sap-ux/logger';

jest.mock('@sap-ux/store');

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
        it('should store credentials when credentials are provided', async () => {
            const configAnswers = {
                system: 'SystemA',
                username: 'user1',
                password: 'pass1',
                application: {} as any
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
            expect(mockSystemService.write).toHaveBeenCalledWith(expect.any(Object), { force: false });
            expect(mockLogger.info).toHaveBeenCalledWith('System credentials have been stored securely.');
        });

        it('should update existing credentials when system already exists in store', async () => {
            const configAnswers = {
                system: 'SystemA',
                username: 'user1',
                password: 'pass1',
                application: {} as any
            };

            (mockSystemLookup.getSystemByName as jest.Mock).mockResolvedValue({
                Name: 'SystemA',
                Client: '010',
                Url: 'https://example.com',
                SystemType: 'OnPrem'
            });

            mockSystemService.read.mockResolvedValue({ name: 'SystemA', url: 'https://example.com' });

            await storeCredentials(configAnswers, mockSystemLookup, mockLogger);

            expect(mockSystemService.write).toHaveBeenCalledWith(expect.any(Object), { force: true });
            expect(mockLogger.info).toHaveBeenCalledWith('System credentials have been stored securely.');
        });

        it('should not store credentials when password is missing', async () => {
            const configAnswers = {
                system: 'SystemA',
                username: 'user1',
                password: '',
                application: {} as any
            } as any;

            await storeCredentials(configAnswers, mockSystemLookup, mockLogger);

            expect(getServiceMock).not.toHaveBeenCalled();
            expect(mockSystemService.write).not.toHaveBeenCalled();
        });

        it('should warn when system endpoint is not found', async () => {
            const configAnswers = {
                system: 'SystemA',
                username: 'user1',
                password: 'pass1',
                application: {} as any
            };

            (mockSystemLookup.getSystemByName as jest.Mock).mockResolvedValue(undefined);

            await storeCredentials(configAnswers, mockSystemLookup, mockLogger);

            expect(mockLogger.warn).toHaveBeenCalledWith('Cannot store credentials: system endpoint or URL not found.');
            expect(mockSystemService.write).not.toHaveBeenCalled();
        });

        it('should handle credential storage errors gracefully', async () => {
            const configAnswers = {
                system: 'SystemA',
                username: 'user1',
                password: 'pass1',
                application: {} as any
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

            expect(mockLogger.error).toHaveBeenCalledWith('Failed to store credentials: Storage failed');
            expect(mockLogger.debug).toHaveBeenCalled();
        });
    });
});
