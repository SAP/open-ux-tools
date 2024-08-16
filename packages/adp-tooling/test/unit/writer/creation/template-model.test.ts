import path from 'path';

import { AdaptationProjectType, SystemInfo } from '@sap-ux/axios-extension';
import { AuthenticationType } from '@sap-ux/store';

import {
    TemplateModel,
    FlexLayer,
    getUI5DeployConfig,
    getI18nModels,
    ManifestService,
    UI5VersionService,
    ProviderService,
    ConfigurationInfoAnswers,
    FlpConfigAnswers,
    DeployConfigAnswers,
    SystemDetails
} from '../../../../src';
import { isAppStudio } from '@sap-ux/btp-utils';

jest.mock('../../../../src/base/app-utils.ts', () => ({
    getApplicationType: jest.fn().mockReturnValue('FreeStyle')
}));

jest.mock('../../../../src/writer/creation/i18n-model.ts', () => ({ getI18nModels: jest.fn().mockReturnValue([]) }));

jest.mock('../../../../src/writer/creation/config.ts', () => ({ getSupportForUI5Yaml: jest.fn() }));

jest.mock('../../../../src/writer/creation/deploy-config.ts', () => ({
    getUI5DeployConfig: jest.fn().mockReturnValue(undefined)
}));

jest.mock('@sap-ux/btp-utils', () => ({
    isAppStudio: jest.fn()
}));

const mockIsAppStudio = isAppStudio as jest.Mock;

const appManifest = jest
    .requireActual('fs')
    .readFileSync(path.join(__dirname, '../../../fixtures/base-app', 'manifest.json'), 'utf-8');

const manifestServiceMock = {
    getManifest: jest.fn().mockReturnValue(appManifest)
};

const ui5ServiceMock = {
    shouldSetMinUI5Version: jest.fn().mockReturnValue(true),
    getVersionToBeUsed: jest.fn().mockReturnValue('1.127.0'),
    latestVersion: '1.127.0'
} as unknown as UI5VersionService;

const providerServiceMock = {
    getProvider: jest.fn().mockReturnValue({
        getLayeredRepository: jest.fn().mockReturnValue({
            getSystemInfo: jest.fn().mockReturnValue({
                activeLanguages: [],
                adaptationProjectTypes: [AdaptationProjectType.CLOUD_READY]
            } as SystemInfo)
        })
    })
} as unknown as ProviderService;

const systemDetails: SystemDetails = {
    url: 'https://example.com',
    client: '100',
    authenticationType: AuthenticationType.ReentranceTicket
};
const basicAnswers = {
    applicationTitle: 'Test App',
    namespace: 'customer.app.variant',
    projectName: 'app.variant'
};
const configAnswers = {
    application: { id: 'app1' },
    projectType: AdaptationProjectType.CLOUD_READY,
    ui5Version: '1.127.0'
} as ConfigurationInfoAnswers;

describe('TemplateModel', () => {
    describe('getTemplateModel', () => {
        it('should assemble a complete template model based on provided answers and system details', async () => {
            const flpConfigAnswers = { title: 'FLP Title', inboundId: 'inboundId' } as FlpConfigAnswers;
            mockIsAppStudio.mockReturnValue(false);

            manifestServiceMock.getManifest.mockReturnValue({});

            const templateModel = new TemplateModel(
                ui5ServiceMock,
                providerServiceMock,
                manifestServiceMock as unknown as ManifestService,
                FlexLayer.CUSTOMER_BASE
            );

            const model = await templateModel.getTemplateModel(
                systemDetails,
                basicAnswers,
                configAnswers,
                flpConfigAnswers,
                {} as DeployConfigAnswers
            );

            expect(manifestServiceMock.getManifest).toHaveBeenCalledWith('app1');
            expect(model).toMatchObject({
                app: {
                    ach: undefined,
                    appType: 'FreeStyle',
                    fioriId: undefined,
                    i18nModels: [],
                    id: 'customer.app.variant',
                    layer: 'CUSTOMER_BASE',
                    reference: 'app1',
                    title: 'Test App'
                },
                target: {
                    client: '100',
                    url: 'https://example.com'
                },
                ui5: {
                    frameworkUrl: 'https://ui5.sap.com',
                    minVersion: '1.127.0',
                    shouldSetMinVersion: true,
                    version: '1.127.0'
                },
                deploy: undefined,
                flp: {},
                customConfig: {
                    adp: {
                        environment: 'C',
                        support: undefined
                    }
                }
            });
        });

        it('should assemble a complete template model based on provided answers and system details', async () => {
            const flpConfigAnswers = { title: 'FLP Title', inboundId: 'inboundId' } as FlpConfigAnswers;
            mockIsAppStudio.mockReturnValue(true);
            manifestServiceMock.getManifest.mockReturnValue({});

            const templateModel = new TemplateModel(
                ui5ServiceMock,
                providerServiceMock,
                manifestServiceMock as unknown as ManifestService,
                FlexLayer.CUSTOMER_BASE
            );

            const model = await templateModel.getTemplateModel(
                {} as SystemDetails,
                basicAnswers,
                { ...configAnswers, system: 'U1Y_100', client: '100' },
                flpConfigAnswers,
                {} as DeployConfigAnswers
            );

            expect(manifestServiceMock.getManifest).toHaveBeenCalledWith('app1');
            expect(model).toMatchObject({
                app: {
                    ach: undefined,
                    appType: 'FreeStyle',
                    fioriId: undefined,
                    i18nModels: [],
                    id: 'customer.app.variant',
                    layer: 'CUSTOMER_BASE',
                    reference: 'app1',
                    title: 'Test App'
                },
                target: {
                    client: '100',
                    destination: 'U1Y_100'
                },
                ui5: {
                    frameworkUrl: 'https://ui5.sap.com',
                    minVersion: '1.127.0',
                    shouldSetMinVersion: true,
                    version: '1.127.0'
                },
                deploy: undefined,
                flp: {},
                customConfig: {
                    adp: {
                        environment: 'C',
                        support: undefined
                    }
                }
            });
        });

        it('throws an error if the manifest is not found', async () => {
            manifestServiceMock.getManifest.mockReturnValue(undefined);

            const templateModel = new TemplateModel(
                ui5ServiceMock,
                providerServiceMock,
                manifestServiceMock as unknown as ManifestService,
                FlexLayer.CUSTOMER_BASE
            );

            await expect(
                templateModel.getTemplateModel(
                    systemDetails,
                    basicAnswers,
                    configAnswers,
                    {} as FlpConfigAnswers,
                    {} as DeployConfigAnswers
                )
            ).rejects.toThrow('Manifest of the application was not found!');
        });
    });
});
