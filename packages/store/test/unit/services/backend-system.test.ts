import { getInstance, SystemService } from '../../../src/services/backend-system';
import { BackendSystem, BackendSystemKey } from '../../../src';
import { SystemDataProvider } from '../../../src/data-provider/backend-system';
import { initI18n, text } from '../../../src/i18n';
import { ToolsLogger, NullTransport } from '@sap-ux/logger';
import * as nodeFs from 'node:fs';

jest.mock('../../../src/data-provider/backend-system');

jest.mock('node:fs', () => {
    const originalFs = jest.requireActual('node:fs');
    return {
        ...originalFs,
        existsSync: jest.fn().mockReturnValue(false),
        readFileSync: jest.fn(),
        writeFileSync: jest.fn(),
        mkdirSync: jest.fn()
    };
});

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
            jest.spyOn(nodeFs, 'readFileSync').mockReturnValueOnce(
                '{"systems":{"https://mock.system1.com": {"name": "Mock System","url": "https://mock.system1.com","systemType": "OnPrem"}}}'
            );
            const existsSyncSpy = jest.spyOn(nodeFs, 'existsSync').mockReturnValueOnce(false); // migration file does not exist
            const writeFileSyncSpy = jest.spyOn(nodeFs, 'writeFileSync');

            const service = getInstance(logger);
            expect(service).toBeInstanceOf(SystemService);
            expect(existsSyncSpy).toHaveBeenCalledWith(expect.stringContaining('.systemsMigrated'));
            expect(writeFileSyncSpy).toHaveBeenNthCalledWith(
                1,
                expect.stringContaining('systems.json'),
                expect.any(String)
            );
            expect(writeFileSyncSpy).toHaveBeenNthCalledWith(
                2,
                expect.stringContaining('.systemsMigrated'),
                expect.stringMatching(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/)
            );
            expect(writeFileSyncSpy).toHaveBeenNthCalledWith(
                3,
                expect.stringContaining('systems.json'),
                expect.any(String)
            );
        });

        it('should merge and write the new systems found in legacy file to .saptools', () => {
            jest.spyOn(nodeFs, 'readFileSync')
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

            jest.spyOn(nodeFs, 'existsSync').mockReturnValueOnce(true); // migration file exists

            const writeFileSyncSpy = jest.spyOn(nodeFs, 'writeFileSync');
            const service = getInstance(logger);
            expect(service).toBeInstanceOf(SystemService);

            expect(writeFileSyncSpy).toHaveBeenNthCalledWith(
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
            jest.spyOn(nodeFs, 'readFileSync').mockReturnValueOnce(
                '{"systems":{"https://mock.system1.com": {"name": "Mock System","url": "https://mock.system1.com","systemType": "OnPrem"}}}'
            );
            jest.spyOn(nodeFs, 'existsSync').mockReturnValueOnce(false); // migration file does not exist
            jest.spyOn(nodeFs, 'mkdirSync').mockImplementationOnce(() => {
                throw new Error('Mock error during mkdirSync');
            });
            const loggerErrorSpy = jest.spyOn(logger, 'error');
            const service = getInstance(logger);
            expect(service).toBeInstanceOf(SystemService);
            expect(loggerErrorSpy).toHaveBeenCalledWith(
                'The migration of the systems.json file from .fioritools to .saptools failed: Mock error during mkdirSync'
            );
        });
    });

    describe('delete', () => {
        it('delegates to data provider', async () => {
            const mockSystemDataProvider = jest.spyOn(SystemDataProvider.prototype, 'delete');
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
            expect(mockSystemDataProvider).toHaveBeenCalledTimes(1);
        });
    });

    describe('partialUpdate', () => {
        it('partial update of non-existent system throws an error', async () => {
            SystemDataProvider.prototype.read = jest.fn().mockResolvedValue(undefined);
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
            SystemDataProvider.prototype.read = jest.fn().mockResolvedValue(existingSystem);
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
            SystemDataProvider.prototype.read = jest.fn().mockResolvedValue(existingSystem);
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
            SystemDataProvider.prototype.read = jest.fn().mockResolvedValue(existingSystem);
            SystemDataProvider.prototype.write = jest.fn().mockImplementation((x) => x);

            const update: Partial<BackendSystem> = { name: 'sys_new' };
            const updatedEntity = await new SystemService(logger).partialUpdate(
                new BackendSystemKey({ url: 'url_existing' }),
                update
            );
            expect(updatedEntity).toEqual({ ...existingSystem, ...update, hasSensitiveData: true });
            expect(SystemDataProvider.prototype.write).toHaveBeenCalledWith(updatedEntity);
        });

        it('partial update does not change keys', async () => {
            const existingSystem = {
                url: 'url_existing',
                name: 'sys_existing',
                serviceKeys: 'serviceKeys_existing',
                username: 'username_existing',
                password: 'password_existing'
            };
            SystemDataProvider.prototype.read = jest.fn().mockResolvedValue(existingSystem);
            SystemDataProvider.prototype.write = jest.fn().mockImplementation((x) => x);

            const update: Partial<BackendSystem> = { url: 'url_new', client: 'client_new', name: 'sys_new' };
            const updatedEntity = await new SystemService(logger).partialUpdate(
                new BackendSystemKey({ url: 'url_existing' }),
                update
            );
            expect(updatedEntity).toEqual({ ...existingSystem, name: update.name, hasSensitiveData: true });
            expect(SystemDataProvider.prototype.write).toHaveBeenCalledWith(updatedEntity);
        });

        it('partial update can be used to set properties to undefined', async () => {
            const existingSystem = {
                url: 'url_existing',
                name: 'sys_existing',
                serviceKeys: 'serviceKeys_existing',
                username: 'username_existing',
                password: 'password_existing'
            };
            SystemDataProvider.prototype.read = jest.fn().mockResolvedValue(existingSystem);
            SystemDataProvider.prototype.write = jest.fn().mockImplementation((x) => x);

            const update: Partial<BackendSystem> = { name: undefined };
            const updatedEntity = await new SystemService(logger).partialUpdate(
                new BackendSystemKey({ url: 'url_existing' }),
                update
            );
            expect(updatedEntity).toEqual({ ...existingSystem, name: update.name, hasSensitiveData: true });
            expect(SystemDataProvider.prototype.write).toHaveBeenCalledWith(updatedEntity);
        });
    });
});
