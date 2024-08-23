import { validateServiceKey, validateSystemName } from '../../../../src/prompts/datasources/sap-system/validators';
import { initI18nOdataServiceInquirer, t } from '../../../../src/i18n';
import { BackendSystem } from '@sap-ux/store';
import { ServiceInfo } from '@sap-ux/btp-utils';

jest.mock('@sap-ux/store', () => ({
    SystemService: jest.fn().mockImplementation(() => ({
        getAll: jest.fn().mockResolvedValue([{ name: 'new system' } as BackendSystem])
    }))
}));
let serviceInfoMock: Partial<ServiceInfo> = {
    uaa: {
        clientid: 'clientid',
        clientsecret: 'client',
        url: 'url'
    },
    url: 'url',
    catalogs: {
        abap: {
            path: 'path',
            type: 'type'
        }
    }
};
const serviceKeyFilePath = '/service/key/file/path';
const unparseableServiceKey = 'unparseableServiceKey';
jest.mock('fs', () => ({
    ...jest.requireActual('fs'),
    readFileSync: jest
        .fn()
        .mockImplementation((path) =>
            path === serviceKeyFilePath ? JSON.stringify(serviceInfoMock) : unparseableServiceKey
        )
}));

describe('prompt validators', () => {
    beforeAll(async () => {
        await initI18nOdataServiceInquirer();
    });

    describe('sap-system validators', () => {
        it('validateSystemName', async () => {
            expect(await validateSystemName('')).toBe(t('prompts.systemName.emptySystemNameWarning'));
            expect(await validateSystemName('new system')).toBe(t('prompts.systemName.systemNameExistsWarning'));
            expect(await validateSystemName('new system1')).toBe(true);
        });

        it('validateServiceKey', async () => {
            expect(await validateServiceKey(serviceKeyFilePath)).toEqual(serviceInfoMock);
            delete serviceInfoMock.catalogs;
            expect(await validateServiceKey(serviceKeyFilePath)).toEqual(
                t('prompts.serviceKey.incompleteServiceKeyInfo')
            );
            expect(await validateServiceKey('any/other/path')).toBe(t('prompts.serviceKey.unparseableServiceKey'));
            expect(await validateServiceKey('')).toBe(false);
        });
    });
});
