import { isAppStudio } from '@sap-ux/btp-utils';
import type { ToolsLogger } from '@sap-ux/logger';
import { createAbapServiceProvider } from '@sap-ux/system-access';
import type { AbapServiceProvider } from '@sap-ux/axios-extension';

import type { RequestOptions } from '../../../src';
import { SourceSystems, getAbapTarget, getConfiguredProvider } from '../../../src';

jest.mock('@sap-ux/btp-utils', () => ({
    ...jest.requireActual('@sap-ux/btp-utils'),
    isAppStudio: jest.fn()
}));

jest.mock('@sap-ux/system-access', () => ({
    ...jest.requireActual('@sap-ux/system-access'),
    createAbapServiceProvider: jest.fn()
}));

const dummyDetails = {
    Name: 'SYS_010',
    Client: '010',
    Url: 'http://sys010.com',
    Authentication: 'Basic',
    Credentials: { username: 'storedUser', password: 'storedPass' }
};

const logger = {
    error: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn()
} as unknown as ToolsLogger;

const dummyProvider = {} as unknown as AbapServiceProvider;

const mockIsAppStudio = isAppStudio as jest.Mock;
const createProviderMock = createAbapServiceProvider as jest.Mock;

const system = dummyDetails.Name;
const client = dummyDetails.Client;

describe('getAbapTarget', () => {
    let getSystemByNameSpy: jest.SpyInstance;

    beforeEach(() => {
        jest.clearAllMocks();
        getSystemByNameSpy = jest.spyOn(SourceSystems.prototype, 'getSystemByName');
    });

    it('should return a destination target when in AppStudio', async () => {
        mockIsAppStudio.mockReturnValue(true);
        getSystemByNameSpy.mockResolvedValue(dummyDetails);

        const target = await getAbapTarget(system, logger);

        expect(target).toEqual({ destination: system });
    });

    it('should return an AbapTarget with auth when not in AppStudio', async () => {
        mockIsAppStudio.mockReturnValue(false);
        getSystemByNameSpy.mockResolvedValue(dummyDetails);
        const requestOptions: RequestOptions = {};

        const target = await getAbapTarget(system, logger, requestOptions, client);

        expect(target).toEqual({
            client,
            url: 'http://sys010.com',
            authenticationType: 'Basic'
        });
        expect(requestOptions.auth).toEqual({
            username: 'storedUser',
            password: 'storedPass'
        });
    });

    it('should throw an error if system details are not found in non-AppStudio', async () => {
        const system = 'NonExisting';
        mockIsAppStudio.mockReturnValue(false);
        getSystemByNameSpy.mockResolvedValue(undefined);

        await expect(getAbapTarget(system, logger)).rejects.toThrow(`No system details found for system: ${system}`);
    });
});

describe('getConfiguredProvider', () => {
    const username = 'user1';
    const password = 'pass1';

    beforeEach(() => {
        mockIsAppStudio.mockReturnValue(false);
        createProviderMock.mockResolvedValue(dummyProvider);
        jest.spyOn(SourceSystems.prototype, 'getSystemByName').mockResolvedValue(dummyDetails);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('should return a configured provider when called with credentials', async () => {
        const provider = await getConfiguredProvider({ system, client, username, password }, logger);

        expect(createProviderMock).toHaveBeenCalled();
        expect(provider).toBe(dummyProvider);
    });

    it('should return a configured provider when called without credentials', async () => {
        const provider = await getConfiguredProvider({ system, client }, logger);
        expect(createProviderMock).toHaveBeenCalled();
        expect(provider).toBe(dummyProvider);
    });

    it('should log an error and throw if provider creation fails', async () => {
        const error = new Error('Provider creation failed');
        createProviderMock.mockRejectedValueOnce(error);

        await expect(getConfiguredProvider({ system, client }, logger)).rejects.toThrow('Provider creation failed');
        expect(logger.error).toHaveBeenCalledWith(
            expect.stringContaining(`Failed to instantiate provider for system: ${system}`)
        );
    });
});
