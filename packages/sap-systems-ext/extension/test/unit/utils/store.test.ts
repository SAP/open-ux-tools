import { getBackendSystem } from '../../../src/utils';

const systemServiceReadMock = jest.fn();

jest.mock('@sap-ux/store', () => ({
    ...jest.requireActual('@sap-ux/store'),
    SystemService: jest.fn().mockImplementation(() => ({
        read: systemServiceReadMock
    }))
}));

describe('Test the store utils', () => {
    it('should return the backend systems from the store', async () => {
        const backendSystem = { url: 'https://example.com', client: '100', name: 'Test System', systemType: 'OnPrem' };
        systemServiceReadMock.mockResolvedValue(backendSystem);
        const systemResult = await getBackendSystem({ url: 'https://example.com', client: '100' });
        expect(systemResult).toStrictEqual(backendSystem);
    });
});
