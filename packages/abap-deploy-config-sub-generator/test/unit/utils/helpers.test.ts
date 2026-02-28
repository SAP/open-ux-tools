import { isAppStudio, listDestinations } from '@sap-ux/btp-utils';
import { getService } from '@sap-ux/store';
import { determineScpFromTarget, determineUrlFromDestination } from '../../../src/utils';
import { determineS4HCFromTarget } from '../../../src/utils/helpers';

jest.mock('@sap-ux/store', () => {
    return {
        ...(jest.requireActual('@sap-ux/store') as {}),
        getService: jest.fn()
    };
});

jest.mock('@sap-ux/btp-utils', () => {
    return {
        ...(jest.requireActual('@sap-ux/btp-utils') as {}),
        isAppStudio: jest.fn(),
        listDestinations: jest.fn()
    };
});

const getServiceMock = getService as jest.Mock;
const isAppStudioMock = isAppStudio as jest.Mock;
const listDestinationsMock = listDestinations as jest.Mock;

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
        Host: 'https://mock.s4hana.url.dest2.com',
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
        isAppStudioMock.mockReturnValue(true);
        listDestinationsMock.mockImplementationOnce(() => {
            throw new Error('401 error');
        });

        const result = await determineScpFromTarget({ destination: 'Dest1' });
        expect(result).toBe(false);
    });

    it('should fail silently when call to backend systems fails', async () => {
        isAppStudioMock.mockReturnValue(false);
        getServiceMock.mockResolvedValue({
            getAll: () => {
                throw new Error('Failure accessing secure store');
            }
        });
        const result = await determineScpFromTarget({ url: 'https://example2.abap.backend:44300', client: '100' });
        expect(result).toBe(false);
    });

    it('should determine the url from the given destination', async () => {
        isAppStudioMock.mockReturnValue(true);
        listDestinationsMock.mockResolvedValue(mockDestinations);

        const result = await determineUrlFromDestination('Dest1');
        expect(result).toBe('https://mock.url.dest1.com');
    });

    it('should determine the scp value from the given destinations', async () => {
        isAppStudioMock.mockReturnValue(true);
        listDestinationsMock.mockResolvedValue(mockDestinations);

        const result = await determineScpFromTarget({ destination: 'Dest1' });
        expect(result).toBe(false);
    });

    it('should determine the scp value from the given backend systems', async () => {
        isAppStudioMock.mockReturnValue(false);
        getServiceMock.mockResolvedValue({
            getAll: jest.fn().mockResolvedValue([backendSystemBtp])
        });
        const result = await determineScpFromTarget({ url: 'https://example.abap.backend:44300', client: '100' });
        expect(result).toBe(true);
    });

    it('should determine the s4hc value from the given destinations', async () => {
        isAppStudioMock.mockReturnValue(true);
        listDestinationsMock.mockResolvedValue(mockDestinations);

        const result = await determineS4HCFromTarget({ destination: 'Dest2' });
        expect(result).toBe(true);
    });

    it('should determine the s4hc value from the given backend systems', async () => {
        isAppStudioMock.mockReturnValue(false);
        getServiceMock.mockResolvedValue({
            getAll: jest.fn().mockResolvedValue([backendSystemOnPrem])
        });
        const result = await determineS4HCFromTarget({ url: 'https://example.abap.backend:44300' });
        expect(result).toBe(false);
    });
});
