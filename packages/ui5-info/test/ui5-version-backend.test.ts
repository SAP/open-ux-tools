import { jest } from '@jest/globals';

const mockAxiosGet = jest.fn();
jest.unstable_mockModule('axios', () => ({
    default: { get: mockAxiosGet },
    __esModule: true
}));

const { getSapSystemUI5Version } = await import('../src/ui5-version-backend');

describe('Get UI5 Version used on backend ABAP system', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('Test getSapSystemUI5Version - host is undefined', async () => {
        const version = await getSapSystemUI5Version('');
        expect(version).toBeFalsy();
    });

    it('Test getSapSystemUI5Version - host is provided', async () => {
        mockAxiosGet.mockResolvedValueOnce({ status: 200, data: { Version: '1.80.2' } });
        const version = await getSapSystemUI5Version('http://abc.com:8080');
        expect(version).toEqual('1.80.2');
    });

    it('Test getSapSystemUI5Version - successful query with invalid response data', async () => {
        mockAxiosGet.mockResolvedValueOnce({
            status: 200,
            data: 'Error message with 200 status code'
        });
        const version = await getSapSystemUI5Version('http://abc.com:8080');
        expect(version).toBeFalsy();
    });

    it('Test getSapSystemUI5Version - version query fail', async () => {
        mockAxiosGet.mockResolvedValueOnce({ status: 403 });
        const version = await getSapSystemUI5Version('http://abc.com:8080');
        expect(version).toBeFalsy();
    });
});
