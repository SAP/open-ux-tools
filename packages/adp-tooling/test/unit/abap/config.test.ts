import { isAppStudio } from '@sap-ux/btp-utils';
import type { ToolsLogger } from '@sap-ux/logger';

import { SystemLookup, getProviderConfig, type RequestOptions } from '../../../src';

jest.mock('@sap-ux/btp-utils', () => ({
    ...jest.requireActual('@sap-ux/btp-utils'),
    isAppStudio: jest.fn()
}));

const logger = {
    error: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn()
} as unknown as ToolsLogger;

const dummyDetails = {
    Name: 'SYS_010',
    Client: '010',
    Url: 'some-url',
    Authentication: 'Basic',
    Credentials: { username: 'storedUser', password: 'storedPass' }
};

const system = dummyDetails.Name;
const client = dummyDetails.Client;

const mockIsAppStudio = isAppStudio as jest.Mock;

describe('getProviderConfig', () => {
    let getSystemByNameSpy: jest.SpyInstance;

    beforeEach(() => {
        jest.clearAllMocks();
        getSystemByNameSpy = jest.spyOn(SystemLookup.prototype, 'getSystemByName');
    });

    it('should return a destination config when in AppStudio', async () => {
        mockIsAppStudio.mockReturnValue(true);
        getSystemByNameSpy.mockResolvedValue(dummyDetails);

        const target = await getProviderConfig(system, logger);

        expect(target).toEqual({ destination: system });
    });

    it('should return an config with auth when not in BAS', async () => {
        mockIsAppStudio.mockReturnValue(false);
        getSystemByNameSpy.mockResolvedValue(dummyDetails);
        const requestOptions: RequestOptions = {};

        const target = await getProviderConfig(system, logger, requestOptions, client);

        expect(target).toEqual({
            client,
            url: 'some-url',
            authenticationType: 'Basic'
        });
        expect(requestOptions.auth).toEqual({
            username: 'storedUser',
            password: 'storedPass'
        });
    });

    it('should throw an error if system details are not found in VS Code', async () => {
        const system = 'NonExisting';
        mockIsAppStudio.mockReturnValue(false);
        getSystemByNameSpy.mockResolvedValue(undefined);

        await expect(getProviderConfig(system, logger)).rejects.toThrow(
            `No system details found for system: ${system}`
        );
    });
});
