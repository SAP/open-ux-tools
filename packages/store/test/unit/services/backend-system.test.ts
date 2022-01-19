import { SystemService } from '../../../src/services/backend-system';
import { BackendSystem, BackendSystemKey } from '../../../src';
import { SystemDataProvider } from '../../../src/data-provider/backend-system';
import { initI18n, text } from '../../../src/i18n';
import { ToolsLogger, NullTransport } from '@sap-ux/logger';

jest.mock('../../../src/data-provider/backend-system');

describe('BackendSystem service', () => {
    beforeAll(async () => {
        await initI18n();
    });

    beforeEach(() => {
        jest.resetAllMocks();
    });

    const logger = new ToolsLogger({ transports: [new NullTransport()] });

    describe('delete', () => {
        it('delegates to data provider', async () => {
            const mockSystemDataProvider = jest.spyOn(SystemDataProvider.prototype, 'delete');
            const systemService = new SystemService(logger);
            await systemService.delete(new BackendSystem({ name: 'system', url: 'some_url', client: 'some_client' }));
            expect(mockSystemDataProvider).toHaveBeenCalledTimes(1);
        });

        it('calls migration only once', async () => {
            jest.spyOn(SystemDataProvider.prototype, 'delete');
            const systemService = new SystemService(logger);
            await systemService.delete(new BackendSystem({ name: 'system', url: 'some_url', client: 'some_client' }));
            await systemService.delete(new BackendSystem({ name: 'system', url: 'some_url', client: 'some_client' }));
            await systemService.delete(new BackendSystem({ name: 'system', url: 'some_url', client: 'some_client' }));
            await systemService.delete(new BackendSystem({ name: 'system', url: 'some_url', client: 'some_client' }));
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
            expect(updatedEntity).toEqual({ ...existingSystem, ...update });
            expect(SystemDataProvider.prototype.write).toBeCalledWith(updatedEntity);
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
            expect(updatedEntity).toEqual({ ...existingSystem, name: update.name });
            expect(SystemDataProvider.prototype.write).toBeCalledWith(updatedEntity);
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
            expect(updatedEntity).toEqual({ ...existingSystem, name: update.name });
            expect(SystemDataProvider.prototype.write).toBeCalledWith(updatedEntity);
        });
    });
});
