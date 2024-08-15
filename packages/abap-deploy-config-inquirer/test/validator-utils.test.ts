import { createTransportNumber, getTransportList, listPackages } from '../src/validator-utils';
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
        expect(await listPackages('PK', {}, {})).toEqual([]);

        const systemConfig = { url: 'http://mock.url', client: '123' };

        mockListPackagesFromService.mockResolvedValueOnce(['PK1', 'PK2']);
        expect(await listPackages('PK', {}, systemConfig)).toEqual(['PK1', 'PK2']);
    });

    it('should list transports', async () => {
        expect(await getTransportList('PK123', 'MOCK_APP', {}, {})).toEqual(undefined);

        const systemConfig = { url: 'http://mock.url', client: '123' };

        mockGetTransportListFromService.mockResolvedValueOnce([
            { transportReqNumber: 'TR1' },
            { transportReqNumber: 'TR2' }
        ]);
        expect(await getTransportList('PK123', 'MOCK_APP', {}, systemConfig)).toEqual([
            { transportReqNumber: 'TR1' },
            { transportReqNumber: 'TR2' }
        ]);

        mockGetTransportListFromService.mockResolvedValueOnce([{ transportReqNumber: '' }]);
        expect(await getTransportList('PK123', 'MOCK_APP', {}, systemConfig)).toEqual([]);
    });

    it('should create transports', async () => {
        const createTransportParams = {
            packageName: 'PK123',
            ui5AppName: 'MOCK_APP',
            description: 'Mock transport'
        };
        expect(await createTransportNumber(createTransportParams, {}, {})).toEqual(undefined);

        const systemConfig = { url: 'http://mock.url', client: '123' };
        mockCreateTransportNumberFromService.mockResolvedValueOnce('NEWTR1');
        expect(await createTransportNumberFromService(createTransportParams, {}, systemConfig)).toEqual('NEWTR1');
    });
});
