import { isAppStudio } from '@sap-ux/btp-utils';
import type { ToolsLogger } from '@sap-ux/logger';
import { createAbapServiceProvider } from '@sap-ux/system-access';
import type { AbapServiceProvider } from '@sap-ux/axios-extension';

import { AbapProvider, TargetSystems } from '../../../src';
import { AbapTarget } from '@sap-ux/ui5-config';

jest.mock('@sap-ux/btp-utils', () => ({
    ...jest.requireActual('@sap-ux/btp-utils'),
    isAppStudio: jest.fn()
}));

jest.mock('@sap-ux/system-access', () => ({
    ...jest.requireActual('@sap-ux/system-access'),
    createAbapServiceProvider: jest.fn()
}));

const getSystemDetailsMock = jest.fn();

const targetSystems = {
    getSystemDetails: getSystemDetailsMock
} as unknown as TargetSystems;

const logger = {
    error: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn()
} as unknown as ToolsLogger;

const dummyProvider = {} as unknown as AbapServiceProvider;

const mockIsAppStudio = isAppStudio as jest.Mock;
const createAbapServiceProviderMock = createAbapServiceProvider as jest.Mock;

describe('AbapProvider', () => {
    let abapProvider: AbapProvider;

    describe('getProvider', () => {
        beforeEach(() => {
            jest.clearAllMocks();
            abapProvider = new AbapProvider(targetSystems, logger);
        });

        test('should throw error if provider is not set', () => {
            expect(() => abapProvider.getProvider()).toThrow('Provider was not set!');
        });
    });

    describe('setProvider', () => {
        beforeEach(() => {
            jest.clearAllMocks();
            abapProvider = new AbapProvider(targetSystems, logger);
        });

        test('should use destination property in BAS', async () => {
            mockIsAppStudio.mockReturnValue(true);
            createAbapServiceProviderMock.mockResolvedValue(dummyProvider);

            const system = 'SYS010';
            const client = '001';
            const username = 'user';
            const password = 'pass';

            await abapProvider.setProvider(system, client, username, password);

            const callArgs = createAbapServiceProviderMock.mock.calls[0];
            const target = callArgs[0] as any;
            expect(target.destination).toBe(system);

            expect(abapProvider.getProvider()).toBe(dummyProvider);
            expect(abapProvider.getSystem()).toBe(system);
        });

        test('should call for system details and set provider in VS Code', async () => {
            const system = 'http://example.com';
            const details = { client: '010', url: system, username: 'username', password: 'password' };

            mockIsAppStudio.mockReturnValue(false);
            getSystemDetailsMock.mockResolvedValue(details);
            createAbapServiceProviderMock.mockResolvedValue(dummyProvider);

            await abapProvider.setProvider(system, undefined, 'user', 'pass');

            expect(getSystemDetailsMock).toHaveBeenCalledWith(system);
            const callArgs = createAbapServiceProviderMock.mock.calls[0];
            const target = callArgs[0] as AbapTarget;

            expect(target.url).toBe(details.url);
            expect(target.client).toBe(details.client);

            expect(abapProvider.getProvider()).toBe(dummyProvider);
            expect(abapProvider.getSystem()).toBe(system);
        });

        test('should log error and throw when createAbapServiceProvider fails', async () => {
            const error = new Error('Test error');
            const system = 'SYS010';

            mockIsAppStudio.mockReturnValue(true);
            createAbapServiceProviderMock.mockRejectedValue(error);

            await expect(abapProvider.setProvider(system)).rejects.toThrow(error.message);

            expect(logger.error).toHaveBeenCalledWith(
                expect.stringContaining(
                    `Failed to instantiate provider for system: ${system}. Reason: ${error.message}`
                )
            );
        });
    });
});
