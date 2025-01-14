import { createTransportNumber, getTransportList, isAppNameValid, listPackages } from '../src/validator-utils';
import {
    listPackagesFromService,
    getTransportListFromService,
    createTransportNumberFromService
} from '../src/service-provider-utils';
import { initI18n, t } from '../src/i18n';

jest.mock('../src/service-provider-utils', () => ({
    listPackagesFromService: jest.fn(),
    getTransportListFromService: jest.fn(),
    createTransportNumberFromService: jest.fn()
}));

const mockListPackagesFromService = listPackagesFromService as jest.Mock;
const mockGetTransportListFromService = getTransportListFromService as jest.Mock;
const mockCreateTransportNumberFromService = createTransportNumberFromService as jest.Mock;

describe('validator-utils', () => {
    beforeAll(async () => {
        await initI18n();
    });

    it('should list packages for the given input', async () => {
        expect(await listPackages('PK', {})).toEqual([]);

        const systemConfig = { url: 'http://mock.url', client: '123' };

        mockListPackagesFromService.mockResolvedValueOnce(['PK1', 'PK2']);
        expect(await listPackages('PK', systemConfig)).toEqual(['PK1', 'PK2']);
    });

    it('should list transports', async () => {
        expect(await getTransportList('PK123', 'MOCK_APP', {})).toEqual(undefined);

        const systemConfig = { url: 'http://mock.url', client: '123' };

        mockGetTransportListFromService.mockResolvedValueOnce([
            { transportReqNumber: 'TR1' },
            { transportReqNumber: 'TR2' }
        ]);
        expect(await getTransportList('PK123', 'MOCK_APP', systemConfig)).toEqual([
            { transportReqNumber: 'TR1' },
            { transportReqNumber: 'TR2' }
        ]);

        mockGetTransportListFromService.mockResolvedValueOnce([{ transportReqNumber: '' }]);
        expect(await getTransportList('PK123', 'MOCK_APP', systemConfig)).toEqual([]);
    });

    it('should create transports', async () => {
        const createTransportParams = {
            packageName: 'PK123',
            ui5AppName: 'MOCK_APP',
            description: 'Mock transport'
        };
        expect(await createTransportNumber(createTransportParams, {})).toEqual(undefined);

        mockCreateTransportNumberFromService.mockResolvedValueOnce('NEWTR1');
        expect(await createTransportNumberFromService(createTransportParams)).toEqual('NEWTR1');
    });

    describe('isAppNameValid', () => {
        test('isAppNameValid - valid simple name', () => {
            const output = isAppNameValid('ZTEST');
            expect(output).toStrictEqual({
                valid: true,
                errorMessage: undefined
            });
        });

        test('isAppNameValid - valid namespace, valid app name', () => {
            const output = isAppNameValid('ZNS/ZTEST');
            expect(output).toStrictEqual({
                valid: true,
                errorMessage: undefined
            });
        });

        test('isAppNameValid - valid namespace, valid app name', () => {
            const output = isAppNameValid('ZNS/TEST');
            expect(output).toStrictEqual({
                valid: true,
                errorMessage: undefined
            });
        });

        test('isAppNameValid - empty length', () => {
            const output = isAppNameValid('');
            expect(output).toStrictEqual({
                valid: false,
                errorMessage: t('errors.validators.appNameRequired')
            });
        });

        test('isAppNameValid - invalid namespace', () => {
            const output = isAppNameValid('/ns1/ns2/ns3/ztest');
            expect(output).toStrictEqual({
                valid: false,
                errorMessage: t('errors.validators.abapInvalidNamespace')
            });
        });

        test('isAppNameValid - invalid namespace length', () => {
            const ns = 'ns1looooooonooog';
            const output = isAppNameValid(`/${ns}/ztest`);
            expect(output).toStrictEqual({
                valid: false,
                errorMessage: t('errors.validators.abapInvalidNamespaceLength', { length: ns.length })
            });
        });

        test('isAppNameValid - valid namespace length, invalid app name length', () => {
            const appName = 'appnamelooooooonooooooog';
            const output = isAppNameValid(`/ns/${appName}`);
            expect(output).toStrictEqual({
                valid: false,
                errorMessage: t('errors.validators.abapInvalidAppNameLength', { length: appName.length })
            });
        });
    });
});
