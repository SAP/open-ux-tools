import { jest } from '@jest/globals';
import type { BackendSystem } from '@sap-ux/store';
import type { ServiceInfo } from '@sap-ux/btp-utils';

const actualStore = await import('@sap-ux/store');
const mockSystems = [{ name: 'new system' } as BackendSystem];
jest.unstable_mockModule('@sap-ux/store', () => ({
    ...actualStore,
    getService: jest.fn().mockImplementation(() => ({
        getAll: jest.fn().mockResolvedValue(mockSystems)
    })),
    isSystemNameInUse: jest.fn().mockImplementation(async (name: string) => {
        const trimmedName = name.trim().toLowerCase();
        return mockSystems.some((system: BackendSystem) => system.name.toLowerCase() === trimmedName);
    })
}));

const serviceInfoMock: Partial<ServiceInfo> = {
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

const actualFs = await import('node:fs');
jest.unstable_mockModule('node:fs', () => ({
    ...actualFs,
    readFileSync: jest
        .fn()
        .mockImplementation((path) =>
            path === serviceKeyFilePath ? JSON.stringify(serviceInfoMock) : unparseableServiceKey
        )
}));

const { initI18nOdataServiceInquirer, t } = await import('../../../../src/i18n.js');
const { validateServiceKey, validateSystemName } =
    await import('../../../../src/prompts/datasources/sap-system/validators.js');

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
