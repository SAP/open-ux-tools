import type { AttributesAnswers, ConfigAnswers } from '@sap-ux/adp-tooling';

import { t } from '../../../src/utils/i18n';
import { getExtensionProjectData } from '../../../src/app/extension-project';

const configAnswers = {
    system: 'SystemA',
    username: 'user1',
    password: 'pass1',
    application: {
        id: 'sap.ui.demoapps.f1',
        bspUrl: '/sap/bc/ui5_ui5/sap/zapp'
    }
} as ConfigAnswers;

const attributeAnswers = {
    projectName: 'app.variant',
    namespace: 'customer.app.variant',
    ui5Version: '1.134.1'
} as AttributesAnswers;

describe('getExtensionProjectData', () => {
    const mockSystemLookup = {
        getSystemByName: jest.fn()
    };

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should return valid ExtensionProjectData', async () => {
        mockSystemLookup.getSystemByName.mockResolvedValue({
            Name: 'SystemA',
            WebIDEUsage: 'dev_abap',
            Host: 'host.example.com',
            'sap-client': '100'
        });

        const result = await getExtensionProjectData(configAnswers, attributeAnswers, mockSystemLookup as any);

        expect(result).toEqual({
            username: 'user1',
            password: 'pass1',
            destination: {
                name: 'SystemA',
                basUsage: 'dev_abap',
                host: 'host.example.com',
                sapClient: '100'
            },
            applicationNS: 'customer.app.variant',
            applicationName: 'app.variant',
            userUI5Ver: '1.134.1',
            BSPUrl: '/sap/bc/ui5_ui5/sap/zapp',
            namespace: 'sap.ui.demoapps.f1'
        });
    });

    it('should throw if application is missing', async () => {
        const badConfig = { ...configAnswers, application: undefined } as any;

        await expect(getExtensionProjectData(badConfig, attributeAnswers, mockSystemLookup as any)).rejects.toThrow(
            t('error.appParameterMissing')
        );
    });

    it('should throw if destination info is missing', async () => {
        mockSystemLookup.getSystemByName.mockResolvedValue(undefined);

        await expect(getExtensionProjectData(configAnswers, attributeAnswers, mockSystemLookup as any)).rejects.toThrow(
            t('error.destinationInfoMissing')
        );
    });
});
