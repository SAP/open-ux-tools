import { jest } from '@jest/globals';
const systemServiceReadMock = jest.fn();

const realStore = await import('@sap-ux/store');
jest.unstable_mockModule('@sap-ux/store', () => ({
    ...realStore,
    getService: jest.fn().mockImplementation(() => ({
        read: systemServiceReadMock
    }))
}));

const { getBackendSystem } = await import('../../../src/utils');

describe('Test the store utils', () => {
    it('should return the backend systems from the store', async () => {
        const backendSystem = { url: 'https://example.com', client: '100', name: 'Test System', systemType: 'OnPrem' };
        systemServiceReadMock.mockResolvedValue(backendSystem);
        const systemResult = await getBackendSystem({ url: 'https://example.com', client: '100' });
        expect(systemResult).toStrictEqual(backendSystem);
    });
});
