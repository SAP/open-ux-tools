import { jest } from '@jest/globals';
import { mockDestinations } from './fixtures/destinations.js';
import { mockTargetSystems } from './fixtures/targets.js';
import type { AbapDeployConfigAnswers, AbapDeployConfigAnswersInternal } from '../src/types.js';
import { PackageInputChoices, TransportChoices } from '../src/types.js';
import { CREATE_TR_DURING_DEPLOY } from '../src/constants.js';

const mockListPackages = jest.fn() as jest.Mock;
const mockGetTransportConfigInstance = jest.fn() as jest.Mock;
const mockGetService = jest.fn() as jest.Mock;
const mockIsAppStudio = jest.fn<typeof realBtpUtils.isAppStudio>();
const mockListDestinations = jest.fn<typeof realBtpUtils.listDestinations>();

jest.unstable_mockModule('../src/validator-utils', () => ({
    listPackages: mockListPackages,
    getTransportList: jest.fn(),
    createTransportNumber: jest.fn(),
    isAppNameValid: jest.fn()
}));

jest.unstable_mockModule('../src/service-provider-utils', () => ({
    getTransportConfigInstance: mockGetTransportConfigInstance,
    listPackagesFromService: jest.fn(),
    getTransportListFromService: jest.fn(),
    createTransportNumberFromService: jest.fn()
}));

jest.unstable_mockModule('@sap-ux/store', () => ({
    getService: mockGetService
}));

const realBtpUtils = await import('@sap-ux/btp-utils');
jest.unstable_mockModule('@sap-ux/btp-utils', () => ({
    ...realBtpUtils,
    isAppStudio: mockIsAppStudio,
    listDestinations: mockListDestinations
}));

const {
    findBackendSystemByUrl,
    findDestination,
    getAbapSystems,
    isSameSystem,
    initTransportConfig,
    getPackageAnswer,
    useCreateTrDuringDeploy,
    queryPackages,
    reconcileAnswers,
    getTransportAnswer
} = await import('../src/utils.js');
const LoggerHelper = (await import('../src/logger-helper.js')).default;
const { initI18n, t } = await import('../src/i18n.js');
const { PromptState } = await import('../src/prompts/prompt-state.js');

describe('Test utils', () => {
    beforeAll(async () => {
        await initI18n();
    });

    afterEach(() => {
        PromptState.resetAbapDeployConfig();
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

    it('should return initialised transport config', async () => {
        mockGetTransportConfigInstance.mockResolvedValueOnce({
            transportConfig: { getPackage: jest.fn() } as any,
            transportConfigNeedsCreds: true
        });
        const initTransportConfigResult = await initTransportConfig({
            backendTarget: undefined,
            url: 'https://mocktarget.url',
            client: '100',
            errorHandler: jest.fn()
        });

        expect(mockGetTransportConfigInstance).toHaveBeenCalledWith({
            backendTarget: undefined,
            credentials: undefined
        });
        expect(initTransportConfigResult.transportConfigNeedsCreds).toBe(true);
    });

    it('should log error when transport config initialisation fails', async () => {
        const errorHandler = jest.fn();
        const result = await initTransportConfig({ backendTarget: undefined, errorHandler });
        expect(result).toStrictEqual({});

        const loggerSpy = jest.spyOn(LoggerHelper.logger, 'debug');
        const errorMsg = 'Transport error';
        const errorObj = new Error(errorMsg);
        mockGetTransportConfigInstance.mockRejectedValueOnce(errorObj);
        const initTransportConfigResult = await initTransportConfig({
            backendTarget: undefined,
            url: 'https://mocktarget.url',
            client: '100',
            errorHandler
        });

        expect(mockGetTransportConfigInstance).toHaveBeenCalledWith({
            backendTarget: undefined,
            credentials: undefined
        });
        expect(initTransportConfigResult.error).toStrictEqual(errorObj);
        expect(errorHandler).toHaveBeenCalledWith(errorObj);
        expect(loggerSpy).toHaveBeenCalledWith(
            t('errors.debugAbapTargetSystem', { method: 'initTransportConfig', error: errorObj.toString() })
        );
    });

    it('should query packages', async () => {
        const packages = ['package1', 'package2'];
        mockListPackages.mockResolvedValueOnce(packages);
        await expect(queryPackages('pack', { url: 'https://target.url', client: '100' })).resolves.toStrictEqual(
            packages
        );
    });

    it('should get package answer', () => {
        const previousAnswers = {
            url: 'https://target.url',
            package: '',
            packageInputChoice: PackageInputChoices.ListExistingChoice,
            packageAutocomplete: 'package1',
            packageManual: ''
        };
        expect(getPackageAnswer(previousAnswers)).toBe('package1');

        previousAnswers.packageInputChoice = PackageInputChoices.EnterManualChoice;
        previousAnswers.packageManual = 'package2';
        expect(getPackageAnswer(previousAnswers)).toBe('package2');
        expect(getPackageAnswer({} as AbapDeployConfigAnswersInternal, 'package3')).toBe('package3');
    });

    it('should return true when exisintg deploy task configuration has CREATE_TR_DURING_DEPLOY value', () => {
        const transport = CREATE_TR_DURING_DEPLOY;
        expect(useCreateTrDuringDeploy(transport)).toBe(true);
    });

    it('should return reconciled answers for destination', () => {
        // tests from reconcileAnswers
        const expectedAnswers: AbapDeployConfigAnswers = {
            destination: 'Dest1',
            url: 'http://dest.btp.url',
            client: '100',
            scp: true,
            ui5AbapRepo: 'Mock Repo',
            description: 'Mock Description',
            package: 'PKGMOCK',
            transport: 'TRMOCK',
            index: true
        };

        PromptState.abapDeployConfig = {
            url: 'http://dest.btp.url',
            client: '100',
            scp: true
        };

        const internalAnswers: AbapDeployConfigAnswersInternal = {
            url: '',
            destination: 'Dest1',
            ui5AbapRepo: 'Mock Repo',
            description: 'Mock Description',
            package: '',
            packageInputChoice: PackageInputChoices.EnterManualChoice,
            packageManual: 'PKGMOCK',
            transportInputChoice: TransportChoices.ListExistingChoice,
            transportFromList: 'TRMOCK',
            index: true
        };

        expect(reconcileAnswers(internalAnswers, PromptState.abapDeployConfig)).toStrictEqual(expectedAnswers);
    });

    it('should return reconciled answers for target system', () => {
        // tests from reconcileAnswers
        const expectedAnswers: AbapDeployConfigAnswers = {
            url: 'htpp://target.url',
            connectPath: '/sap/bc/test',
            client: '100',
            ui5AbapRepo: 'Mock Repo',
            description: 'Mock Description',
            package: 'PKGMOCK',
            transport: CREATE_TR_DURING_DEPLOY,
            overwrite: false
        };

        PromptState.abapDeployConfig = {
            connectPath: '/sap/bc/test',
            client: '100',
            scp: false
        };

        const internalAnswers: AbapDeployConfigAnswersInternal = {
            url: 'http://dest.btp.url',
            targetSystem: 'htpp://target.url',
            ui5AbapRepo: 'Mock Repo',
            description: 'Mock Description',
            package: '',
            packageInputChoice: PackageInputChoices.ListExistingChoice,
            packageAutocomplete: 'PKGMOCK',
            transportInputChoice: TransportChoices.CreateDuringDeployChoice,
            transportFromList: CREATE_TR_DURING_DEPLOY,
            overwrite: false
        };

        expect(reconcileAnswers(internalAnswers, PromptState.abapDeployConfig)).toStrictEqual(expectedAnswers);
    });

    describe('getTransportAnswer', () => {
        it('should return transportManual', () => {
            const result = getTransportAnswer({ url: '', package: '', transportManual: 'TRMANUAL' });
            expect(result).toBe('TRMANUAL');
        });

        it('should return transportFromList if transportManual is undefined', () => {
            const result = getTransportAnswer({ url: '', package: '', transportFromList: 'TRLIST' });
            expect(result).toBe('TRLIST');
        });

        it('should return transportCreated if others are undefined', () => {
            const result = getTransportAnswer({ url: '', package: '', transportCreated: 'TRCREATED' });
            expect(result).toBe('TRCREATED');
        });

        it('returns CREATE_TR_DURING_DEPLOY if transportInputChoice is CreateDuringDeployChoice', () => {
            const result = getTransportAnswer({
                url: '',
                package: '',
                transportInputChoice: TransportChoices.CreateDuringDeployChoice
            });
            expect(result).toBe(CREATE_TR_DURING_DEPLOY);
        });

        it('returns empty string if all inputs are undefined', () => {
            const result = getTransportAnswer();
            expect(result).toBe('');
        });
    });
});
