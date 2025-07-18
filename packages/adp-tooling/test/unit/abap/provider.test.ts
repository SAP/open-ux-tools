import { isAppStudio } from '@sap-ux/btp-utils';
import type { ToolsLogger } from '@sap-ux/logger';
import { createAbapServiceProvider } from '@sap-ux/system-access';
import type { AbapServiceProvider } from '@sap-ux/axios-extension';

import { getProviderConfig, getConfiguredProvider } from '../../../src';

jest.mock('@sap-ux/btp-utils', () => ({
    ...jest.requireActual('@sap-ux/btp-utils'),
    isAppStudio: jest.fn()
}));

jest.mock('@sap-ux/system-access', () => ({
    ...jest.requireActual('@sap-ux/system-access'),
    createAbapServiceProvider: jest.fn()
}));

jest.mock('../../../src/abap/config.ts', () => ({
    getProviderConfig: jest.fn()
}));

const logger = {
    error: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn()
} as unknown as ToolsLogger;

const dummyProvider = {} as unknown as AbapServiceProvider;

const mockIsAppStudio = isAppStudio as jest.Mock;
const getProviderConfigMock = getProviderConfig as jest.Mock;
const createProviderMock = createAbapServiceProvider as jest.Mock;

const system = 'SYS_010';
const client = '010';
const username = 'user1';
const password = 'pass1';

describe('getConfiguredProvider', () => {
    beforeEach(() => {
        mockIsAppStudio.mockReturnValue(false);
        createProviderMock.mockResolvedValue(dummyProvider);
        getProviderConfigMock.mockResolvedValue({ system, client });
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
