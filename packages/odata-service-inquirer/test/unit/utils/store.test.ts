import { jest } from '@jest/globals';

const mockGetAll = jest.fn();

const actualStore = await import('@sap-ux/store');

jest.unstable_mockModule('@sap-ux/store', () => ({
    ...actualStore,
    getService: jest.fn().mockImplementation(() => ({
        getAll: mockGetAll
    }))
}));

const { initI18nOdataServiceInquirer } = await import('../../../src/i18n.js');
const LoggerHelper = (await import('../../../src/prompts/logger-helper.js')).default;
const { getAllBackendSystems } = await import('../../../src/utils/store.js');

describe('Test utils related to the store', () => {
    beforeAll(async () => {
        await initI18nOdataServiceInquirer();
    });

    it('it should return backend systems', async () => {
        mockGetAll.mockResolvedValueOnce([
            {
                name: 'sys1',
                url: 'url1',
                client: 'client1',
                username: 'user1',
                password: 'pass1'
            },
            {
                name: 'sys2',
                url: 'url2',
                client: 'client2',
                username: 'user2',
                password: 'pass2'
            }
        ]);
        const backendSystems = await getAllBackendSystems();
        expect(backendSystems).toHaveLength(2);
        expect(backendSystems?.[0].name).toBe('sys1');
        expect(backendSystems?.[1].name).toBe('sys2');
    });
    it('it should handle errors when retrieving backend systems', async () => {
        const loggerErrorSpy = jest.spyOn(LoggerHelper.logger, 'error').mockImplementation(() => {});
        mockGetAll.mockRejectedValueOnce(new Error('Test error'));
        const backendSystems = await getAllBackendSystems();
        expect(backendSystems).toEqual([]);
        expect(loggerErrorSpy).toHaveBeenCalledWith(
            expect.stringContaining('An error occurred when retrieving the backend systems from the store: Test error')
        );
    });
});
