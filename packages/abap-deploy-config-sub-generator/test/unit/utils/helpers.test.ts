import { jest } from '@jest/globals';

// Pre-import real modules BEFORE mocking to avoid circular resolution OOM
const realBtpUtils = await import('@sap-ux/btp-utils');
const realStore = await import('@sap-ux/store');

const mockIsAppStudio = jest.fn();
const mockListDestinations = jest.fn();
const mockGetService = jest.fn();

jest.unstable_mockModule('@sap-ux/btp-utils', () => ({
    ...realBtpUtils,
    isAppStudio: mockIsAppStudio,
    listDestinations: mockListDestinations
}));

jest.unstable_mockModule('@sap-ux/store', () => ({
    ...realStore,
    getService: mockGetService
}));

const { determineScpFromTarget, determineUrlFromDestination } = await import('../../../src/utils');
const { determineS4HCFromTarget } = await import('../../../src/utils/helpers');

const mockDestinations = {
    Dest1: {
        Name: 'Dest1',
        Type: 'HTTP',
        Authentication: 'BasicAuthentication',
        Description: 'Mock destination',
        Host: 'https://mock.url.dest1.com',
        ProxyType: 'OnPremise',
        WebIDEUsage: 'odata_abap'
    },
    Dest2: {
        Name: 'Dest2',
        Type: 'HTTP',
        Authentication: 'SAMLAssertion',
        Description: 'Mock destination 2',
        Host: 'https://mock.url.dest2.com',
        ProxyType: 'Internet',
        WebIDEUsage: 'odata_abap'
    }
};

const backendSystemOnPrem = {
    url: 'https://example.abap.backend:44300',
    name: 'SYS_010',
    password: 'some-pw',
    userDisplayName: 'some-name',
    username: 'some-user'
};

const backendSystemBtp = {
    url: 'https://example.abap.backend:44300',
    client: '100',
    name: 'SYS_BTP',
    serviceKeys: '<MOCK SERVICE KEYS FOR SYS_BTP>',
    userDisplayName: 'some-name'
};

describe('Test the helpers for abap sub gen', () => {
    beforeEach(() => {
        jest.resetAllMocks();
    });

    it('should fail silently when call to destinations fails', async () => {
        mockIsAppStudio.mockReturnValue(true);
        mockListDestinations.mockImplementationOnce(() => {
            throw new Error('401 error');
        });

        const result = await determineScpFromTarget({ destination: 'Dest1' });
        expect(result).toBe(false);
    });

    it('should fail silently when call to backend systems fails', async () => {
        mockIsAppStudio.mockReturnValue(false);
        mockGetService.mockResolvedValue({
            getAll: () => {
                throw new Error('Failure accessing secure store');
            }
        });
        const result = await determineScpFromTarget({ url: 'https://example2.abap.backend:44300', client: '100' });
        expect(result).toBe(false);
    });

    it('should determine the url from the given destination', async () => {
        mockIsAppStudio.mockReturnValue(true);
        mockListDestinations.mockResolvedValue(mockDestinations);

        const result = await determineUrlFromDestination('Dest1');
        expect(result).toBe('https://mock.url.dest1.com');
    });

    it('should determine the scp value from the given destinations', async () => {
        mockIsAppStudio.mockReturnValue(true);
        mockListDestinations.mockResolvedValue(mockDestinations);

        const result = await determineScpFromTarget({ destination: 'Dest1' });
        expect(result).toBe(false);
    });

    it('should determine the scp value from the given backend systems', async () => {
        mockIsAppStudio.mockReturnValue(false);
        mockGetService.mockResolvedValue({
            getAll: jest.fn().mockResolvedValue([backendSystemBtp])
        });
        const result = await determineScpFromTarget({ url: 'https://example.abap.backend:44300', client: '100' });
        expect(result).toBe(true);
    });

    it('should determine the s4hc value from the given destinations', async () => {
        mockIsAppStudio.mockReturnValue(true);
        mockListDestinations.mockResolvedValue(mockDestinations);

        const result = await determineS4HCFromTarget({ destination: 'Dest2' });
        expect(result).toBe(true);
    });

    it('should determine the s4hc value from the given backend systems', async () => {
        mockIsAppStudio.mockReturnValue(false);
        mockGetService.mockResolvedValue({
            getAll: jest.fn().mockResolvedValue([backendSystemOnPrem])
        });
        const result = await determineS4HCFromTarget({ url: 'https://example.abap.backend:44300' });
        expect(result).toBe(false);
    });
});
