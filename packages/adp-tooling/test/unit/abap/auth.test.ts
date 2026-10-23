import { jest } from '@jest/globals';
import type { AxiosError } from '@sap-ux/axios-extension';
import type { ToolsLogger } from '@sap-ux/logger';

const mockIsAxiosError = jest.fn<typeof realAxiosExtension.isAxiosError>();
const realAxiosExtension = await import('@sap-ux/axios-extension');
jest.unstable_mockModule('@sap-ux/axios-extension', () => ({
    ...realAxiosExtension,
    isAxiosError: mockIsAxiosError
}));

const mockGetCsrfToken = jest.fn();
const mockGetLayeredRepository = jest.fn().mockReturnValue({ getCsrfToken: mockGetCsrfToken });
const mockGetConfiguredProvider = jest.fn().mockResolvedValue({
    getLayeredRepository: mockGetLayeredRepository
});
jest.unstable_mockModule('../../../src/abap/provider.js', () => ({
    getConfiguredProvider: mockGetConfiguredProvider
}));

const mockIsAppStudio = jest.fn<typeof realBtpUtils.isAppStudio>();
const realBtpUtils = await import('@sap-ux/btp-utils');
jest.unstable_mockModule('@sap-ux/btp-utils', () => ({
    ...realBtpUtils,
    isAppStudio: mockIsAppStudio
}));

const mockIsBasicAuthConfigured = jest.fn<() => Promise<boolean>>();
const realSystems = await import('../../../src/source/systems.js');
jest.unstable_mockModule('../../../src/source/systems.js', () => ({
    ...realSystems,
    SystemLookup: jest.fn().mockImplementation(() => ({
        isBasicAuthConfigured: mockIsBasicAuthConfigured
    }))
}));

const { SystemNotFoundError } = await import('../../../src/abap/config.js');
const { isAuthRequired } = await import('../../../src/abap/auth.js');

const logger = {
    error: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn()
} as unknown as ToolsLogger;

describe('isAuthRequired', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockGetLayeredRepository.mockReturnValue({ getCsrfToken: mockGetCsrfToken });
        mockGetConfiguredProvider.mockResolvedValue({ getLayeredRepository: mockGetLayeredRepository });
        mockIsAppStudio.mockReturnValue(false);
        mockIsBasicAuthConfigured.mockResolvedValue(false);
    });

    it('should return false when getCsrfToken succeeds', async () => {
        mockGetCsrfToken.mockResolvedValue(undefined);

        const result = await isAuthRequired('SYS010', logger);

        expect(result).toBe(false);
        expect(mockGetConfiguredProvider).toHaveBeenCalledWith({ system: 'SYS010' }, logger);
    });

    it('should return true when getCsrfToken returns 401 and not in BAS', async () => {
        const axiosError = { response: { status: 401 } } as AxiosError;
        mockGetCsrfToken.mockRejectedValue(axiosError);
        mockIsAxiosError.mockReturnValue(true);
        mockIsAppStudio.mockReturnValue(false);

        const result = await isAuthRequired('SYS010', logger);

        expect(result).toBe(true);
    });

    it('should return true when getCsrfToken returns 401 in BAS and destination does not have Basic auth configured', async () => {
        const axiosError = { message: 'Unauthorized', response: { status: 401 } } as AxiosError;
        mockGetCsrfToken.mockRejectedValue(axiosError);
        mockIsAxiosError.mockReturnValue(true);
        mockIsAppStudio.mockReturnValue(true);
        mockIsBasicAuthConfigured.mockResolvedValue(false);

        const result = await isAuthRequired('SYS010', logger);

        expect(result).toBe(true);
    });

    it('should throw when getCsrfToken returns 401 in BAS and destination has Basic auth configured', async () => {
        const axiosError = { message: 'Unauthorized', response: { status: 401 } } as AxiosError;
        mockGetCsrfToken.mockRejectedValue(axiosError);
        mockIsAxiosError.mockReturnValue(true);
        mockIsAppStudio.mockReturnValue(true);
        mockIsBasicAuthConfigured.mockResolvedValue(true);

        await expect(isAuthRequired('SYS010', logger)).rejects.toThrow(
            'Please check the SAP BTP destination authentication configuration.'
        );
    });

    it('should return true when system is not found in the store', async () => {
        mockGetConfiguredProvider.mockRejectedValue(new SystemNotFoundError('SYS010'));

        const result = await isAuthRequired('SYS010', logger);

        expect(result).toBe(true);
    });

    it('should rethrow when provider setup fails with an unrelated error', async () => {
        const error = new Error('Network failure');
        mockGetConfiguredProvider.mockRejectedValue(error);

        await expect(isAuthRequired('SYS010', logger)).rejects.toThrow('Network failure');
    });

    it('should rethrow when getCsrfToken fails with a non-401 axios error', async () => {
        const axiosError = { response: { status: 500 } } as AxiosError;
        mockGetCsrfToken.mockRejectedValue(axiosError);
        mockIsAxiosError.mockReturnValue(true);

        await expect(isAuthRequired('SYS010', logger)).rejects.toEqual(axiosError);
    });

    it('should rethrow when getCsrfToken fails with a non-axios error', async () => {
        const error = new Error('Network failure');
        mockGetCsrfToken.mockRejectedValue(error);
        mockIsAxiosError.mockReturnValue(false);

        await expect(isAuthRequired('SYS010', logger)).rejects.toThrow('Network failure');
    });
});
