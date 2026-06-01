import { jest } from '@jest/globals';

const mockSystemDataProviderProto = {
    read: jest.fn(),
    write: jest.fn(),
    delete: jest.fn(),
    getAll: jest.fn()
};

jest.unstable_mockModule('../../../src/data-provider/backend-system', () => ({
    SystemDataProvider: jest.fn().mockImplementation(() => mockSystemDataProviderProto)
}));

const mockExistsSync = jest.fn<(path: string) => boolean>().mockReturnValue(false);
const mockReadFileSync = jest.fn();
const mockWriteFileSync = jest.fn();
const mockMkdirSync = jest.fn();

// Import actual fs BEFORE mocking to avoid infinite resolution loops
const actualFs = await import('node:fs');

jest.unstable_mockModule('node:fs', () => ({
    ...actualFs,
    default: actualFs.default,
    existsSync: mockExistsSync,
    readFileSync: mockReadFileSync,
    writeFileSync: mockWriteFileSync,
    mkdirSync: mockMkdirSync
}));

const { getInstance, SystemService } = await import('../../../src/services/backend-system');
const { BackendSystem, BackendSystemKey } = await import('../../../src');
const { initI18n, text } = await import('../../../src/i18n');
const { NullTransport, ToolsLogger } = await import('@sap-ux/logger');

describe('BackendSystem service', () => {
    beforeAll(async () => {
        await initI18n();
    });

    const logger = new ToolsLogger({ transports: [new NullTransport()] });

    describe('getInstance', () => {
        afterEach(() => {
            jest.clearAllMocks();
        });

        it('creates an instance of SystemService', () => {
            const service = getInstance(logger, { baseDirectory: 'some_directory' });
            expect(service).toBeInstanceOf(SystemService);
        });

        it('should check for legacy .fioritools path and migrate systems.json if it exists', () => {
            mockReadFileSync.mockReturnValueOnce(
                '{"systems":{"https://mock.system1.com": {"name": "Mock System","url": "https://mock.system1.com","systemType": "OnPrem"}}}'
            );
            mockExistsSync
                .mockReturnValueOnce(true) // legacy file exists
                .mockReturnValueOnce(false); // migration file does not exist

            const service = getInstance(logger);
            expect(service).toBeInstanceOf(SystemService);
            expect(mockExistsSync).toHaveBeenCalledWith(expect.stringContaining('.systemsMigrated'));
            expect(mockWriteFileSync).toHaveBeenNthCalledWith(
                1,
                expect.stringContaining('systems.json'),
                expect.any(String)
            );
            expect(mockWriteFileSync).toHaveBeenNthCalledWith(
                2,
                expect.stringContaining('.systemsMigrated'),
                expect.stringMatching(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/)
            );
            expect(mockWriteFileSync).toHaveBeenNthCalledWith(
                3,
                expect.stringContaining('systems.json'),
                expect.any(String)
            );
        });

        it('should merge and write the new systems found in legacy file to .saptools', () => {
            mockReadFileSync
                .mockReturnValueOnce(
                    JSON.stringify({
                        systems: {
                            'https://mock.system1.com': {
                                name: 'Mock System',
                                url: 'https://mock.system1.com',
                                systemType: 'OnPrem',
                                _migrated: true
                            },
                            'https://mock.system2.com': {
                                name: 'Mock System 2',
                                url: 'https://mock.system2.com',
                                systemType: 'OnPrem'
                            }
                        }
                    })
                )
                .mockReturnValueOnce(
                    '{"systems":{"https://mock.system1.com": {"name": "Mock System","url": "https://mock.system1.com","systemType": "OnPrem"}}}'
                );

            mockExistsSync
                .mockReturnValueOnce(true) // legacy file exists
                .mockReturnValueOnce(true); // migration file exists

            const service = getInstance(logger);
            expect(service).toBeInstanceOf(SystemService);

            expect(mockWriteFileSync).toHaveBeenNthCalledWith(
                1,
                expect.stringContaining('.saptools'),
                JSON.stringify(
                    {
                        systems: {
                            'https://mock.system1.com': {
                                name: 'Mock System',
                                url: 'https://mock.system1.com',
                                systemType: 'OnPrem'
                            },
                            'https://mock.system2.com': {
                                name: 'Mock System 2',
                                url: 'https://mock.system2.com',
                                systemType: 'OnPrem'
                            }
                        }
                    },
                    null,
                    2
                )
            );
        });

        it('should log an error', () => {
            mockReadFileSync.mockReturnValueOnce(
                '{"systems":{"https://mock.system1.com": {"name": "Mock System","url": "https://mock.system1.com","systemType": "OnPrem"}}}'
            );
            mockExistsSync
                .mockReturnValueOnce(true) // legacy file exists
                .mockReturnValueOnce(false); // migration file does not exist
            mockMkdirSync.mockImplementationOnce(() => {
                throw new Error('Mock error during mkdirSync');
            });
            const loggerErrorSpy = jest.spyOn(logger, 'error');
            const service = getInstance(logger);
            expect(service).toBeInstanceOf(SystemService);
            expect(loggerErrorSpy).toHaveBeenCalledWith(
                'The migration of the systems.json file from .fioritools to .saptools failed: Mock error during mkdirSync'
            );
        });

        it('should not attempt migration if legacy file does not exist', () => {
            mockExistsSync.mockReturnValueOnce(false); // legacy file does not exist
            const service = getInstance(logger);
            expect(service).toBeInstanceOf(SystemService);
            expect(mockReadFileSync).not.toHaveBeenCalled();
        });
    });

    describe('delete', () => {
        it('delegates to data provider', async () => {
            const systemService = new SystemService(logger);
            await systemService.delete(
                new BackendSystem({
                    name: 'system',
                    url: 'some_url',
                    client: 'some_client',
                    systemType: 'OnPrem',
                    connectionType: 'abap_catalog'
                })
            );
            expect(mockSystemDataProviderProto.delete).toHaveBeenCalledTimes(1);
        });
    });

    describe('partialUpdate', () => {
        it('partial update of non-existent system throws an error', async () => {
            mockSystemDataProviderProto.read.mockResolvedValue(undefined);
            const key = new BackendSystemKey({ url: 'url_new', client: 'client_new' });
            await expect(new SystemService(logger).partialUpdate(key, { name: 'new_name' })).rejects.toThrow(
                text('error.systemDoesNotExist', { system: key })
            );
        });

        it('partial update with no properties passed in is an error', async () => {
            const existingSystem = {
                url: 'url_existing',
                name: 'sys_existing',
                serviceKeys: 'serviceKeys_existing',
                username: 'username_existing',
                password: 'password_existing'
            };
            mockSystemDataProviderProto.read.mockResolvedValue(existingSystem);
            const key = new BackendSystemKey({ url: 'url_new', client: 'client_new' });
            await expect(new SystemService(logger).partialUpdate(key, {})).rejects.toThrow(
                text('error.noPropertiesSpecified')
            );
        });

        it('partial update with no properties passed in is an error', async () => {
            const existingSystem = {
                url: 'url_existing',
                name: 'sys_existing',
                serviceKeys: 'serviceKeys_existing',
                username: 'username_existing',
                password: 'password_existing'
            };
            mockSystemDataProviderProto.read.mockResolvedValue(existingSystem);
            const key = new BackendSystemKey({ url: 'url_new', client: 'client_new' });
            await expect(new SystemService(logger).partialUpdate(key, undefined)).rejects.toThrow(
                text('error.noPropertiesSpecified')
            );
        });

        it('partial update changes only specified fields', async () => {
            const existingSystem = {
                url: 'url_existing',
                name: 'sys_existing',
                serviceKeys: 'serviceKeys_existing',
                username: 'username_existing',
                password: 'password_existing'
            };
            mockSystemDataProviderProto.read.mockResolvedValue(existingSystem);
            mockSystemDataProviderProto.write.mockImplementation((x) => x);

            const update = { name: 'sys_new' };
            const updatedEntity = await new SystemService(logger).partialUpdate(
                new BackendSystemKey({ url: 'url_existing' }),
                update
            );
            expect(updatedEntity).toEqual({ ...existingSystem, ...update, hasSensitiveData: true });
            expect(mockSystemDataProviderProto.write).toHaveBeenCalledWith(updatedEntity);
        });

        it('partial update does not change keys', async () => {
            const existingSystem = {
                url: 'url_existing',
                name: 'sys_existing',
                serviceKeys: 'serviceKeys_existing',
                username: 'username_existing',
                password: 'password_existing'
            };
            mockSystemDataProviderProto.read.mockResolvedValue(existingSystem);
            mockSystemDataProviderProto.write.mockImplementation((x) => x);

            const update = { url: 'url_new', client: 'client_new', name: 'sys_new' };
            const updatedEntity = await new SystemService(logger).partialUpdate(
                new BackendSystemKey({ url: 'url_existing' }),
                update
            );
            expect(updatedEntity).toEqual({ ...existingSystem, name: update.name, hasSensitiveData: true });
            expect(mockSystemDataProviderProto.write).toHaveBeenCalledWith(updatedEntity);
        });

        it('partial update can be used to set properties to undefined', async () => {
            const existingSystem = {
                url: 'url_existing',
                name: 'sys_existing',
                serviceKeys: 'serviceKeys_existing',
                username: 'username_existing',
                password: 'password_existing'
            };
            mockSystemDataProviderProto.read.mockResolvedValue(existingSystem);
            mockSystemDataProviderProto.write.mockImplementation((x) => x);

            const update = { name: undefined };
            const updatedEntity = await new SystemService(logger).partialUpdate(
                new BackendSystemKey({ url: 'url_existing' }),
                update
            );
            expect(updatedEntity).toEqual({ ...existingSystem, name: update.name, hasSensitiveData: true });
            expect(mockSystemDataProviderProto.write).toHaveBeenCalledWith(updatedEntity);
        });
    });
});
