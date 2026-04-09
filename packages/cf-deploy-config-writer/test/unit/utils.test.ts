import {
    validateVersion,
    toMtaModuleName,
    runCommand,
    getBTPDestinations,
    getDestinationProperties
} from '../../src/utils';
import { MTAVersion } from '../../src/constants';
import { CommandRunner } from '@sap-ux/nodejs-utils';
import * as btp from '@sap-ux/btp-utils';

jest.mock('@sap-ux/btp-utils', () => ({
    ...jest.requireActual('@sap-ux/btp-utils'),
    isAppStudio: jest.fn(),
    listDestinations: jest.fn()
}));

describe('CF utils', () => {
    beforeAll(async () => {
        jest.clearAllMocks();
    });

    afterAll(async () => {
        jest.resetAllMocks();
    });

    describe('Utils methods', () => {
        test('Validate - validateVersion', async () => {
            expect(() => validateVersion('0.0.0')).toThrow();
            expect(() => validateVersion('~Version')).toThrow();
            expect(() => validateVersion()).not.toThrow();
            expect(validateVersion(MTAVersion)).toBeTruthy();
            expect(validateVersion('1')).toBeTruthy();
        });

        test('Validate - toMtaModuleName', () => {
            expect(toMtaModuleName('0.0.0')).toEqual('000');
            expect(toMtaModuleName('cf_mta_id')).toEqual('cf_mta_id');
            expect(toMtaModuleName('cf.mta.00')).toEqual('cfmta00');
            expect(toMtaModuleName('cf_mta.!£$%^&*,()')).toEqual('cf_mta');
        });

        test('Validate - runCommand', async () => {
            const mockRun = jest.fn();
            jest.spyOn(CommandRunner.prototype, 'run').mockImplementation(mockRun);

            // Test successful command execution
            mockRun.mockResolvedValueOnce('success');
            await expect(runCommand('/test/path', 'npm', ['install'], 'Install failed')).resolves.not.toThrow();
            expect(mockRun).toHaveBeenCalledWith('npm', ['install'], { cwd: '/test/path' });

            // Test failed command execution with error message
            const errorMessage = 'Command execution failed';
            mockRun.mockRejectedValueOnce(new Error(errorMessage));
            await expect(runCommand('/test/path', 'npm', ['build'], 'Build failed')).rejects.toThrow(
                `Build failed: ${errorMessage}`
            );

            // Test failed command execution with non-Error object
            mockRun.mockRejectedValueOnce('Unknown error');
            await expect(runCommand('/test/path', 'npm', ['test'], 'Test failed')).rejects.toThrow(
                'Test failed: Unknown error'
            );

            jest.restoreAllMocks();
        });
    });

    describe('getBTPDestinations', () => {
        let listDestinationsMock: jest.SpyInstance;

        beforeEach(() => {
            listDestinationsMock = jest.spyOn(btp, 'listDestinations');
            listDestinationsMock.mockReset();
        });

        afterEach(() => {
            jest.restoreAllMocks();
        });

        test('fetches destinations and populates cache', async () => {
            const mockDestinations = { dest1: { Name: 'dest1' } } as any;
            listDestinationsMock.mockResolvedValue(mockDestinations);

            const cache: { list?: any } = {};
            const result = await getBTPDestinations(cache);

            expect(result).toBe(mockDestinations);
            expect(listDestinationsMock).toHaveBeenCalledTimes(1);
            expect(cache.list).toBe(mockDestinations);
        });

        test('returns cached result without calling listDestinations again', async () => {
            const mockDestinations = { dest1: { Name: 'dest1' } } as any;
            listDestinationsMock.mockResolvedValue(mockDestinations);

            const cache: { list?: any } = {};
            await getBTPDestinations(cache);
            const result = await getBTPDestinations(cache);

            expect(result).toBe(mockDestinations);
            expect(listDestinationsMock).toHaveBeenCalledTimes(1);
        });

        test('each independent cache object triggers a fresh fetch', async () => {
            const first = { dest1: { Name: 'dest1' } } as any;
            const second = { dest2: { Name: 'dest2' } } as any;
            listDestinationsMock.mockResolvedValueOnce(first).mockResolvedValueOnce(second);

            const result1 = await getBTPDestinations({});
            const result2 = await getBTPDestinations({});

            expect(result1).toBe(first);
            expect(result2).toBe(second);
            expect(listDestinationsMock).toHaveBeenCalledTimes(2);
        });

        test('uses empty cache by default (no module-level state)', async () => {
            const mockDestinations = {} as any;
            listDestinationsMock.mockResolvedValue(mockDestinations);

            await getBTPDestinations();
            await getBTPDestinations();

            // Without a shared cache object, each call with default `{}` fetches fresh
            expect(listDestinationsMock).toHaveBeenCalledTimes(2);
        });
    });

    describe('getDestinationProperties', () => {
        let isAppStudioMock: jest.SpyInstance;
        let listDestinationsMock: jest.SpyInstance;

        const mockDestinations = {
            fullUrlDest: {
                Name: 'fullUrlDest',
                Authentication: 'OAuth2SAMLBearerAssertion',
                WebIDEAdditionalData: btp.WebIDEAdditionalData.FULL_URL,
                WebIDEUsage: btp.WebIDEUsage.ODATA_GENERIC
            },
            normalDest: {
                Name: 'normalDest',
                Authentication: 'NoAuthentication',
                WebIDEUsage: btp.WebIDEUsage.ODATA_GENERIC
            }
        } as any;

        beforeEach(() => {
            isAppStudioMock = jest.spyOn(btp, 'isAppStudio');
            listDestinationsMock = jest.spyOn(btp, 'listDestinations').mockResolvedValue(mockDestinations);
            listDestinationsMock.mockReset();
            listDestinationsMock.mockResolvedValue(mockDestinations);
        });

        afterEach(() => {
            jest.restoreAllMocks();
        });

        test('returns defaults when not in AppStudio', async () => {
            isAppStudioMock.mockReturnValue(false);

            const result = await getDestinationProperties('fullUrlDest');

            expect(result.destinationIsFullUrl).toBe(false);
            expect(result.destinationAuthentication).toBeUndefined();
            expect(listDestinationsMock).not.toHaveBeenCalled();
        });

        test('returns defaults when destination is undefined', async () => {
            isAppStudioMock.mockReturnValue(true);

            const result = await getDestinationProperties(undefined);

            expect(result.destinationIsFullUrl).toBe(false);
            expect(result.destinationAuthentication).toBeUndefined();
            expect(listDestinationsMock).not.toHaveBeenCalled();
        });

        test('resolves full-URL destination in AppStudio', async () => {
            isAppStudioMock.mockReturnValue(true);

            const result = await getDestinationProperties('fullUrlDest');

            expect(result.destinationIsFullUrl).toBe(true);
            expect(result.destinationAuthentication).toBe('OAuth2SAMLBearerAssertion');
        });

        test('resolves non-full-URL destination in AppStudio', async () => {
            isAppStudioMock.mockReturnValue(true);

            const result = await getDestinationProperties('normalDest');

            expect(result.destinationIsFullUrl).toBe(false);
            expect(result.destinationAuthentication).toBe('NoAuthentication');
        });

        test('returns defaults when destination name not found in list', async () => {
            isAppStudioMock.mockReturnValue(true);

            const result = await getDestinationProperties('unknownDest');

            expect(result.destinationIsFullUrl).toBe(false);
            expect(result.destinationAuthentication).toBeUndefined();
        });

        test('shared cache object avoids duplicate listDestinations calls', async () => {
            isAppStudioMock.mockReturnValue(true);

            const cache: { list?: any } = {};
            await getDestinationProperties('fullUrlDest', cache);
            await getDestinationProperties('normalDest', cache);

            expect(listDestinationsMock).toHaveBeenCalledTimes(1);
        });
    });
});
