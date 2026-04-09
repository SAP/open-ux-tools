import { jest } from '@jest/globals';
import type { ToolsLogger } from '@sap-ux/logger';
import type { SystemLookup } from '../../../src/source/systems';

// MOCKS - use jest.unstable_mockModule for ESM compatibility
const mockGetService = jest.fn();
jest.unstable_mockModule('@sap-ux/store', () => ({
    getService: mockGetService,
    BackendSystem: class BackendSystem {
        constructor(public data: any) {
            Object.assign(this, data);
        }
    },
    BackendSystemKey: class BackendSystemKey {
        constructor(public data: any) {
            Object.assign(this, data);
        }
    },
    SystemType: { AbapOnPrem: 'AbapOnPrem', AbapOnBtp: 'AbapOnBtp' },
    AuthenticationType: {},
    ConnectionType: {},
    Entity: class {},
    getFilesystemWatcherFor: jest.fn(),
    getBackendSystemType: jest.fn(),
    getFioriToolsDirectory: jest.fn(),
    getSapToolsDirectory: jest.fn(),
    FioriToolsSettings: {},
    SapTools: {}
}));

const { storeCredentials } = await import('../../../src/base/credentials');

describe('Credential Storage Logic', () => {
    let mockSystemService: any;
    let mockLogger: ToolsLogger;
    let mockSystemLookup: SystemLookup;

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

        mockGetService.mockResolvedValue(mockSystemService);
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

            (mockSystemLookup.getSystemByName as ReturnType<typeof jest.fn>).mockResolvedValue({
                Name: 'SystemA',
                Client: '010',
                Url: 'https://example.com',
                SystemType: 'OnPrem'
            });

            mockSystemService.read.mockResolvedValue(null);

            await storeCredentials(configAnswers, mockSystemLookup, mockLogger);

            expect(mockGetService).toHaveBeenCalledWith({ entityName: 'system' });
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

            (mockSystemLookup.getSystemByName as ReturnType<typeof jest.fn>).mockResolvedValue({
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

            expect(mockGetService).not.toHaveBeenCalled();
            expect(mockSystemService.write).not.toHaveBeenCalled();
        });

        it('should warn when system endpoint is not found', async () => {
            const configAnswers = {
                system: 'SystemA',
                username: 'user1',
                password: 'pass1',
                application: {} as any
            };

            (mockSystemLookup.getSystemByName as ReturnType<typeof jest.fn>).mockResolvedValue(undefined);

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

            (mockSystemLookup.getSystemByName as ReturnType<typeof jest.fn>).mockResolvedValue({
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
