import { jest } from '@jest/globals';
import type { ToolsLogger } from '@sap-ux/logger';

// MOCKS - use jest.unstable_mockModule for ESM compatibility
const mockIsAppStudio = jest.fn();
const realBtpUtils = await import('@sap-ux/btp-utils');
jest.unstable_mockModule('@sap-ux/btp-utils', () => ({
    ...realBtpUtils,
    isAppStudio: mockIsAppStudio
}));

const { SystemLookup } = await import('../../../src/source/systems');
const { getProviderConfig } = await import('../../../src/abap/config');
import type { RequestOptions } from '../../../src/abap/config.js';

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

describe('getProviderConfig', () => {
    let getSystemByNameSpy: ReturnType<typeof jest.spyOn>;

    beforeEach(() => {
        jest.clearAllMocks();
        getSystemByNameSpy = jest.spyOn(SystemLookup.prototype, 'getSystemByName');
    });

    it('should return a destination config when in AppStudio', async () => {
        mockIsAppStudio.mockReturnValue(true);
        getSystemByNameSpy.mockResolvedValue(dummyDetails as any);

        const target = await getProviderConfig(system, logger);

        expect(target).toEqual({ destination: system });
    });

    it('should return an config with auth when not in BAS', async () => {
        mockIsAppStudio.mockReturnValue(false);
        getSystemByNameSpy.mockResolvedValue(dummyDetails as any);
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
