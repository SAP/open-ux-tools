import { isAppStudio, listDestinations } from '@sap-ux/btp-utils';
import { mockDestinations } from './fixtures/destinations';
import {
    findBackendSystemByUrl,
    findDestination,
    getAbapSystems,
    isSameSystem,
    initTransportConfig,
    getPackageAnswer,
    useCreateTrDuringDeploy,
    queryPackages,
    reconcileAnswers
} from '../src/utils';
import { getService } from '@sap-ux/store';
import { mockTargetSystems } from './fixtures/targets';
import { getTransportConfigInstance } from '../src/service-provider-utils';
import { listPackages } from '../src/validator-utils';
import LoggerHelper from '../src/logger-helper';
import { initI18n, t } from '../src/i18n';
import {
    AbapDeployConfigAnswers,
    AbapDeployConfigAnswersInternal,
    PackageInputChoices,
    TransportChoices
} from '../src/types';
import { CREATE_TR_DURING_DEPLOY } from '../src/constants';
import { PromptState } from '../src/prompts/prompt-state';

jest.mock('../src/validator-utils', () => ({
    ...jest.requireActual('../src/validator-utils'),
    listPackages: jest.fn()
}));

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
const mockListPackages = listPackages as jest.Mock;

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
        mockGetTransportConfigInstance.mockResolvedValueOnce({
            transportConfig: { getPackage: jest.fn() } as any,
            transportConfigNeedsCreds: true
        });
        const initTransportConfigResult = await initTransportConfig({
            backendTarget: undefined,
            scp: false,
            url: 'https://mocktarget.url',
            client: '100',
            errorHandler: jest.fn()
        });

        expect(mockGetTransportConfigInstance).toBeCalledWith({
            backendTarget: undefined,
            scp: false,
            credentials: undefined
        });
        expect(initTransportConfigResult.transportConfigNeedsCreds).toBe(true);
    });

    it('should log error when transport config initialisation fails', async () => {
        const errorHandler = jest.fn();
        const result = await initTransportConfig({ backendTarget: undefined, scp: false, errorHandler });
        expect(result).toStrictEqual({});

        const loggerSpy = jest.spyOn(LoggerHelper.logger, 'debug');
        const errorMsg = 'Transport error';
        const errorObj = new Error(errorMsg);
        mockGetTransportConfigInstance.mockRejectedValueOnce(errorObj);
        const initTransportConfigResult = await initTransportConfig({
            backendTarget: undefined,
            scp: false,
            url: 'https://mocktarget.url',
            client: '100',
            errorHandler
        });

        expect(mockGetTransportConfigInstance).toBeCalledWith({
            backendTarget: undefined,
            scp: false,
            credentials: undefined
        });
        expect(initTransportConfigResult.error).toStrictEqual(errorObj);
        expect(errorHandler).toBeCalledWith(errorObj);
        expect(loggerSpy).toBeCalledWith(
            t('errors.debugAbapTargetSystem', { method: 'initTransportConfig', error: errorObj.toString() })
        );
    });

    it('should query packages', () => {
        const packages = ['package1', 'package2'];
        mockListPackages.mockResolvedValueOnce(packages);
        expect(queryPackages('pack', { url: 'https://target.url', client: '100' })).resolves.toStrictEqual(packages);
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
            client: '100',
            ui5AbapRepo: 'Mock Repo',
            description: 'Mock Description',
            package: 'PKGMOCK',
            transport: CREATE_TR_DURING_DEPLOY,
            overwrite: false
        };

        PromptState.abapDeployConfig = {
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
});
