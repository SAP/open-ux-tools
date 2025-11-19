import { initI18nOdataServiceInquirer } from '../../../src/i18n';
import LoggerHelper from '../../../src/prompts/logger-helper';
import { getAllBackendSystems } from '../../../src/utils/store';

const mockGetAll = jest.fn();
jest.mock('@sap-ux/store', () => ({
    ...jest.requireActual('@sap-ux/store'),
    getService: jest.fn().mockImplementation(() => ({
        getAll: mockGetAll
    }))
}));

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
