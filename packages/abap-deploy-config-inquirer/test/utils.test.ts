import { isAppStudio, listDestinations } from '@sap-ux/btp-utils';
import { mockDestinations } from './fixtures/destinations';
import {
    findBackendSystemByUrl,
    findDestination,
    getAbapSystems,
    isSameSystem,
    initTransportConfig
} from '../src/utils';
import { getService } from '@sap-ux/store';
import { mockTargetSystems } from './fixtures/targets';
import { getTransportConfigInstance } from '../src/service-provider-utils';
import LoggerHelper from '../src/logger-helper';
import { initI18n, t } from '../src/i18n';

jest.mock('../src/service-provider-utils', () => ({
    ...jest.requireActual('../src/service-provider-utils'),
    getTransportConfigInstance: jest.fn()
}));

jest.mock('@sap-ux/store', () => ({
    ...jest.requireActual('@sap-ux/store'),
    getService: jest.fn()
}));

jest.mock('@sap-ux/btp-utils', () => ({
    isAppStudio: jest.fn(),
    listDestinations: jest.fn()
}));

const mockGetService = getService as jest.Mock;
const mockIsAppStudio = isAppStudio as jest.Mock;
const mockListDestinations = listDestinations as jest.Mock;
const mockGetTransportConfigInstance = getTransportConfigInstance as jest.Mock;

describe('Test utils', () => {
    beforeAll(async () => {
        await initI18n();
    });

    it('should return abap systems (App Studio)', async () => {
        mockIsAppStudio.mockReturnValueOnce(true);
        mockListDestinations.mockResolvedValueOnce(mockDestinations);

        expect(await getAbapSystems()).toStrictEqual({ destinations: mockDestinations, backendSystems: undefined });
    });

    it('should return abap systems (VSCode)', async () => {
        mockIsAppStudio.mockReturnValueOnce(false);
        mockGetService.mockResolvedValueOnce({
            getAll: jest.fn().mockResolvedValueOnce(mockTargetSystems)
        });
        expect(await getAbapSystems()).toStrictEqual({ destinations: undefined, backendSystems: mockTargetSystems });
    });

    it('should find destination', async () => {
        mockIsAppStudio.mockReturnValueOnce(true);
        mockListDestinations.mockResolvedValueOnce(mockDestinations);

        await getAbapSystems();
        const destName = mockDestinations.Dest1.Name;
        expect(findDestination(destName)).toStrictEqual(mockDestinations.Dest1);
    });

    it('should backend system with url', async () => {
        mockIsAppStudio.mockReturnValueOnce(false);
        mockGetService.mockResolvedValueOnce({
            getAll: jest.fn().mockResolvedValueOnce(mockTargetSystems)
        });
        await getAbapSystems();
        const backendUrl = mockTargetSystems[0].url;
        expect(findBackendSystemByUrl(backendUrl)).toStrictEqual(mockTargetSystems[0]);
    });

    it('should return true for is same system', () => {
        // backend system
        const abapSystem = {
            url: 'http://known.target.url',
            client: '100'
        };
        const url = 'http://known.target.url';
        const client = '100';
        expect(isSameSystem(abapSystem, url, client)).toBe(true);

        // destination
        const destination = mockDestinations.Dest1;
        const abapSystemDest = {
            destination: 'Dest1'
        };
        expect(isSameSystem(abapSystemDest, undefined, undefined, destination.Name)).toBe(true);
    });

    it('should return initialised transport config', async () => {
        const loggerSpy = jest.spyOn(LoggerHelper.logger, 'debug');
        const errorMsg = 'Transport error';
        mockGetTransportConfigInstance.mockResolvedValueOnce({
            transportConfig: { getPackage: jest.fn() } as any,
            transportConfigNeedsCreds: true,
            error: errorMsg
        });
        const initTransportConfigResult = await initTransportConfig({
            options: {},
            scp: false,
            url: 'https://mocktarget.url',
            client: '100',
            errorHandler: jest.fn()
        });

        expect(mockGetTransportConfigInstance).toBeCalledWith({
            options: {},
            scp: false,
            credentials: undefined,
            systemConfig: {
                url: 'https://mocktarget.url',
                client: '100',
                destination: undefined
            }
        });
        expect(initTransportConfigResult.transportConfigNeedsCreds).toBe(true);
        expect(loggerSpy).toBeCalledWith(
            t('errors.debugAbapTargetSystem', { method: 'initTransportConfig', error: errorMsg })
        );
    });
});