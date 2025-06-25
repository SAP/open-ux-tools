import { initI18nOdataServiceInquirer } from '../../../../src/i18n';
import { suggestSystemName, getBackendSystemType } from '../../../../src/prompts/datasources/sap-system/prompt-helpers';
import type { BackendSystem } from '@sap-ux/store';

jest.mock('@sap-ux/store', () => ({
    __esModule: true, // Workaround to for spyOn TypeError: Jest cannot redefine property
    ...jest.requireActual('@sap-ux/store'),
    getFilesystemStore: jest.fn().mockImplementation(() => ({
        getAll: jest.fn().mockResolvedValue([{ name: 'system1' }, { name: 'system2' }, { name: 'system2 (1)' }])
    }))
}));

describe('Test prompt-helpers', () => {
    const systemUrl = 'https://ldciu1y.wdf.sap.corp:44355';
    const client = '010';

    beforeAll(async () => {
        await initI18nOdataServiceInquirer();
    });

    test('Test that initial suggested system names are correct', async () => {
        expect(await suggestSystemName(systemUrl, client)).toBe('https://ldciu1y.wdf.sap.corp:44355, client 010');
        expect(await suggestSystemName(systemUrl)).toBe('https://ldciu1y.wdf.sap.corp:44355');
        expect(await suggestSystemName('system1', client)).toBe('system1, client 010');
        expect(await suggestSystemName('system1')).toBe('system1 (1)');
        expect(await suggestSystemName('system2')).toBe('system2 (2)');
    });

    test('Test that the backend system type is determined correctly', () => {
        const systemWithReentranceTicket = {
            authenticationType: 'reentranceTicket'
        };
        const systemWithServiceKeys = {
            serviceKeys: '<serviceKeys>'
        };
        const systemOnPrem = {
            username: 'user1',
            password: 'password1'
        };

        expect(getBackendSystemType(systemWithReentranceTicket as BackendSystem)).toBe('S4HC');
        expect(getBackendSystemType(systemWithServiceKeys as BackendSystem)).toBe('BTP');
        expect(getBackendSystemType(systemOnPrem as BackendSystem)).toBe('OnPrem');
    });
});
