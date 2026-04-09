import { jest } from '@jest/globals';

const actualStore = await import('@sap-ux/store');
jest.unstable_mockModule('@sap-ux/store', () => ({
    ...actualStore,
    getService: jest.fn().mockImplementation(() => ({
        getAll: jest.fn().mockResolvedValue([{ name: 'system1' }, { name: 'system2' }, { name: 'system2 (1)' }])
    }))
}));

const { initI18nOdataServiceInquirer } = await import('../../../../src/i18n');
const { suggestSystemName } = await import('../../../../src/prompts/datasources/sap-system/prompt-helpers');

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
});
