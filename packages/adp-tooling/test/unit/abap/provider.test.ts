import { jest } from '@jest/globals';
import type { ToolsLogger } from '@sap-ux/logger';
import type { AbapServiceProvider } from '@sap-ux/axios-extension';
import { AxiosError, AxiosHeaders, type AxiosResponse } from 'axios';

// MOCKS - use jest.unstable_mockModule for ESM compatibility
const mockIsAppStudio = jest.fn<typeof realBtpUtils.isAppStudio>();
const realBtpUtils = await import('@sap-ux/btp-utils');
jest.unstable_mockModule('@sap-ux/btp-utils', () => ({
    ...realBtpUtils,
    isAppStudio: mockIsAppStudio
}));

const mockCreateAbapServiceProvider = jest.fn() as jest.Mock;
jest.unstable_mockModule('@sap-ux/system-access', () => ({
    createAbapServiceProvider: mockCreateAbapServiceProvider,
    isUrlTarget: jest.fn(),
    isDestinationTarget: jest.fn(),
    isBasicAuth: jest.fn(),
    isServiceAuth: jest.fn(),
    getCredentialsFromStore: jest.fn(),
    storeCredentials: jest.fn(),
    getCredentialsFromEnvVariables: jest.fn(),
    getCredentialsWithPrompts: jest.fn(),
    questions: {},
    inquirer: {}
}));

const mockGetProviderConfig = jest.fn() as jest.Mock;
jest.unstable_mockModule('../../../src/abap/config', () => ({
    getProviderConfig: mockGetProviderConfig
}));

const { getConfiguredProvider } = await import('../../../src/abap/provider.js');

const logger = {
    error: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn()
} as unknown as ToolsLogger;

const mockUseResponseInterceptor = jest.fn<AbapServiceProvider['interceptors']['response']['use']>();
const dummyProvider = {
    interceptors: {
        response: {
            use: mockUseResponseInterceptor
        }
    }
} as unknown as AbapServiceProvider;

const system = 'SYS_010';
const client = '010';
const username = 'user1';
const password = 'pass1';

describe('getConfiguredProvider', () => {
    beforeEach(() => {
        mockIsAppStudio.mockReturnValue(false);
        mockCreateAbapServiceProvider.mockResolvedValue(dummyProvider);
        mockGetProviderConfig.mockResolvedValue({ system, client });
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('should return a configured provider when called with credentials', async () => {
        const provider = await getConfiguredProvider({ system, client, username, password }, logger);

        expect(mockCreateAbapServiceProvider).toHaveBeenCalled();
        expect(provider).toBe(dummyProvider);
    });

    it('should return a configured provider when called without credentials', async () => {
        const provider = await getConfiguredProvider({ system, client }, logger);
        expect(mockCreateAbapServiceProvider).toHaveBeenCalled();
        expect(provider).toBe(dummyProvider);
    });

    it.each(['/sap/bc/adt', '/', undefined])(
        'should return the response unchanged and log only non-root request URLs: %s',
        async (url) => {
            await getConfiguredProvider({ system, client }, logger);
            const [onFulfilled] = mockUseResponseInterceptor.mock.calls[0];
            const response: AxiosResponse = {
                data: {},
                status: 200,
                statusText: 'OK',
                headers: {},
                config: { url, headers: new AxiosHeaders() }
            };

            expect(onFulfilled?.(response)).toBe(response);
            if (url && url !== '/') {
                expect(logger.debug).toHaveBeenCalledTimes(1);
                expect(logger.debug).toHaveBeenCalledWith(`Request URL: ${url}`);
            } else {
                expect(logger.debug).not.toHaveBeenCalled();
            }
        }
    );

    it.each([{ method: 'get', url: '/sap/bc/adt', headers: new AxiosHeaders() }, undefined])(
        'should log Axios errors and reject with the original error (config: %j)',
        async (config) => {
            await getConfiguredProvider({ system, client }, logger);
            const [, onRejected] = mockUseResponseInterceptor.mock.calls[0];
            const error = new AxiosError('Request failed', 'ERR_BAD_REQUEST', config);

            await expect(onRejected?.(error)).rejects.toBe(error);
            expect(logger.error).toHaveBeenCalledTimes(2);
            expect(logger.error).toHaveBeenNthCalledWith(
                1,
                `Request failed: ${config?.method.toUpperCase()} ${config?.url}`
            );
            expect(logger.error).toHaveBeenNthCalledWith(2, 'Error message: Request failed');
        }
    );

    it('should reject non-Axios errors without logging them', async () => {
        await getConfiguredProvider({ system, client }, logger);
        const [, onRejected] = mockUseResponseInterceptor.mock.calls[0];
        const error = new Error('Unexpected error');

        await expect(onRejected?.(error)).rejects.toBe(error);
        expect(logger.error).not.toHaveBeenCalled();
    });

    it('should log an error and throw if provider creation fails', async () => {
        const error = new Error('Provider creation failed');
        mockCreateAbapServiceProvider.mockRejectedValueOnce(error);

        await expect(getConfiguredProvider({ system, client }, logger)).rejects.toThrow('Provider creation failed');
        expect(logger.error).toHaveBeenCalledWith(
            expect.stringContaining(`Failed to instantiate provider for system: ${system}`)
        );
    });
});
