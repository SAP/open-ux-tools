import type { AxiosResponse } from 'axios';
import * as memfs from 'memfs';
import { processToolsSuiteTelemetry } from '../../src/tooling-telemetry';
import { ToolingTelemetrySettings } from '../../src/tooling-telemetry/config-state';
import fs from 'fs';
import { join } from 'path';

jest.mock('fs', () => {
    const fs1 = jest.requireActual('fs');
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const Union = require('unionfs').Union;
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const vol = require('memfs').vol;
    return new Union().use(fs1).use(vol as unknown as typeof fs);
});

const isAppStudioMock = jest.fn();
jest.mock('@sap-ux/btp-utils', () => {
    return {
        ...(jest.requireActual('@sap-ux/btp-utils') as {}),
        isAppStudio: (): boolean => isAppStudioMock()
    };
});

const axiosGetMock = jest.fn();
jest.mock('axios', () => {
    return {
        ...(jest.requireActual('axios') as {}),
        get: (): AxiosResponse => axiosGetMock()
    };
});

describe('Tools Suite Telemetry Tests', () => {
    jest.setTimeout(10000);

    beforeEach(() => {
        memfs.vol.reset();
    });

    it('No additional properties, Not SBAS', async () => {
        isAppStudioMock.mockReturnValue(false);
        const commonProperties = await processToolsSuiteTelemetry(undefined);
        expect(commonProperties).toEqual({
            appstudio: false,
            'cmn.appstudio': false,
            'cmn.devspace': '',
            'cmn.internalFeatures': 'external',
            internalVsExternal: 'external',
            'cmn.nodeVersion': expect.any(String)
        });
    });

    it('No additional properties, SBAS', async () => {
        isAppStudioMock.mockReturnValue(true);
        const mockResponse = {
            data: {
                config: {
                    annotations: {
                        pack: 'SAP Fiori'
                    }
                }
            }
        } as AxiosResponse;
        axiosGetMock.mockReturnValue(mockResponse);
        process.env.H2O_URL = 'testSbasUrl';
        process.env.WORKSPACE_ID = 'testSbasWorkspaceId';

        const commonProperties = await processToolsSuiteTelemetry(undefined);
        expect(commonProperties).toEqual({
            appstudio: true,
            'cmn.appstudio': true,
            'cmn.devspace': 'SAP Fiori',
            'cmn.internalFeatures': 'external',
            internalVsExternal: 'external',
            'cmn.nodeVersion': expect.any(String)
        });
    });

    it('internalFeaturesEnabled initSetting', async () => {
        isAppStudioMock.mockReturnValue(true);
        const mockResponse = {
            data: {
                config: {
                    annotations: {
                        pack: 'SAP Fiori'
                    }
                }
            }
        } as AxiosResponse;
        axiosGetMock.mockReturnValue(mockResponse);
        process.env.H2O_URL = 'testSbasUrl';
        process.env.WORKSPACE_ID = 'testSbasWorkspaceId';

        delete process.env['TOOLSUITE_INTERNAL'];
        let commonProperties = await processToolsSuiteTelemetry(undefined);
        expect(commonProperties).toEqual({
            appstudio: true,
            internalVsExternal: 'external',
            'cmn.appstudio': true,
            'cmn.devspace': 'SAP Fiori',
            'cmn.internalFeatures': 'external',
            'cmn.nodeVersion': expect.any(String)
        });

        commonProperties = await processToolsSuiteTelemetry(undefined);
        expect(commonProperties).toEqual({
            appstudio: true,
            internalVsExternal: 'external',
            'cmn.appstudio': true,
            'cmn.devspace': 'SAP Fiori',
            'cmn.internalFeatures': 'external',
            'cmn.nodeVersion': expect.any(String)
        });

        ToolingTelemetrySettings.internalFeature = true;
        commonProperties = await processToolsSuiteTelemetry(undefined);
        expect(commonProperties).toEqual({
            appstudio: true,
            internalVsExternal: 'internal',
            'cmn.appstudio': true,
            'cmn.devspace': 'SAP Fiori',
            'cmn.internalFeatures': 'internal',
            'cmn.nodeVersion': expect.any(String)
        });

        ToolingTelemetrySettings.internalFeature = false;
        commonProperties = await processToolsSuiteTelemetry(undefined);
        expect(commonProperties).toEqual({
            appstudio: true,
            internalVsExternal: 'external',
            'cmn.appstudio': true,
            'cmn.devspace': 'SAP Fiori',
            'cmn.internalFeatures': 'external',
            'cmn.nodeVersion': expect.any(String)
        });
    });

    it('telemetryHelperProperties - tsTemplate - LROP', async () => {
        memfs.vol.fromNestedJSON(
            {
                ['/project1/README.md']: fs.readFileSync(
                    join(__dirname, 'fixtures/fiori_elements/README_LROPv4.md'),
                    'utf-8'
                ),
                ['/project1/package.json']: fs.readFileSync(
                    join(__dirname, 'fixtures/fiori_elements/package.json'),
                    'utf-8'
                ),
                ['/project1/webapp/manifest.json']: fs.readFileSync(
                    join(__dirname, 'fixtures/fiori_elements/webapp/manifest.json'),
                    'utf-8'
                )
            },
            '/'
        );

        isAppStudioMock.mockReturnValue(false);
        const commonProperties = await processToolsSuiteTelemetry({
            appPath: '/project1'
        });
        expect(commonProperties).toEqual({
            appstudio: false,
            'cmn.template': 'List Report Page V4',
            'cmn.deployTarget': 'NO_DEPLOY_CONFIG',
            'cmn.odataSource': 'ABAP',
            'cmn.appstudio': false,
            'cmn.devspace': '',
            'cmn.internalFeatures': 'external',
            'cmn.toolsId': 'NO_TOOLS_ID',
            internalVsExternal: 'external',
            'cmn.nodeVersion': expect.any(String),
            'cmn.templateId': '',
            'cmn.templateVersion': '',
            'cmn.appLanguage': '',
            'cmn.applicationType': 'SAP Fiori elements'
        });
    });

    it('telemetryHelperProperties - tsTemplate - Form Object Object Page', async () => {
        memfs.vol.fromNestedJSON(
            {
                ['/project1/README.md']: fs.readFileSync(
                    join(__dirname, '/fixtures/fiori_elements/README_Form.md'),
                    'utf-8'
                ),
                ['/project1/package.json']: fs.readFileSync(
                    join(__dirname, 'fixtures/fiori_elements/package.json'),
                    'utf-8'
                ),
                ['/project1/webapp/manifest.json']: fs.readFileSync(
                    join(__dirname, 'fixtures/fiori_elements/webapp/manifest.json'),
                    'utf-8'
                )
            },
            '/'
        );

        isAppStudioMock.mockReturnValue(false);
        const commonProperties = await processToolsSuiteTelemetry({
            appPath: '/project1'
        });
        expect(commonProperties).toEqual({
            appstudio: false,
            'cmn.template': 'Form Entry Object Page',
            'cmn.toolsId': 'NO_TOOLS_ID',
            'cmn.deployTarget': 'NO_DEPLOY_CONFIG',
            'cmn.odataSource': 'ABAP',
            'cmn.appstudio': false,
            'cmn.devspace': '',
            'cmn.internalFeatures': 'external',
            internalVsExternal: 'external',
            'cmn.nodeVersion': expect.any(String),
            'cmn.appLanguage': '',
            'cmn.templateId': '',
            'cmn.templateVersion': '',
            'cmn.applicationType': 'SAP Fiori elements'
        });
    });

    it('telemetryHelperProperties - tsDeployTarget - CF', async () => {
        memfs.vol.fromNestedJSON(
            {
                ['/project1/ui5-deploy.yaml']: fs.readFileSync(
                    join(__dirname, 'fixtures/fiori_elements/ui5-deploy.cf.yaml'),
                    'utf-8'
                ),
                ['/project1/package.json']: fs.readFileSync(
                    join(__dirname, 'fixtures/fiori_elements/package.json'),
                    'utf-8'
                ),
                ['/project1/webapp/manifest.json']: fs.readFileSync(
                    join(__dirname, 'fixtures/fiori_elements/webapp/manifest.json'),
                    'utf-8'
                ),
                ['/project1/webapp/Component.ts']: fs.readFileSync(
                    join(__dirname, 'fixtures/fiori_elements/webapp/Component.ts'),
                    'utf-8'
                ),
                ['/project1/tsconfig.json']: fs.readFileSync(
                    join(__dirname, 'fixtures/fiori_elements/tsconfig.json'),
                    'utf-8'
                )
            },
            '/'
        );

        isAppStudioMock.mockReturnValue(false);
        const commonProperties = await processToolsSuiteTelemetry({
            appPath: '/project1'
        });
        expect(commonProperties).toEqual({
            appstudio: false,
            'cmn.template': '',
            'cmn.toolsId': 'NO_TOOLS_ID',
            'cmn.deployTarget': 'CF',
            'cmn.odataSource': 'ABAP',
            'cmn.appstudio': false,
            'cmn.devspace': '',
            'cmn.internalFeatures': 'external',
            internalVsExternal: 'external',
            'cmn.appLanguage': 'TypeScript',
            'cmn.nodeVersion': expect.any(String),
            'cmn.templateId': '',
            'cmn.templateVersion': '',
            'cmn.applicationType': 'SAP Fiori elements'
        });
    });

    it('telemetryHelperProperties - tsDeployTarget - ABAP', async () => {
        memfs.vol.fromNestedJSON(
            {
                ['./project1/package.json']: fs.readFileSync(
                    join(__dirname, 'fixtures/fiori_elements/package.json'),
                    'utf-8'
                ),
                ['./project1/webapp/Component.js']: fs.readFileSync(
                    join(__dirname, 'fixtures/fiori_elements/webapp/Component.js'),
                    'utf-8'
                ),
                ['./project1/ui5-deploy.yaml']: fs.readFileSync(
                    join(__dirname, 'fixtures/fiori_elements/ui5-deploy.abap.yaml'),
                    'utf-8'
                ),
                ['/project1/webapp/manifest.json']: fs.readFileSync(
                    join(__dirname, 'fixtures/fiori_elements/webapp/manifest.json'),
                    'utf-8'
                )
            },
            '/'
        );

        isAppStudioMock.mockReturnValue(false);
        const commonProperties = await processToolsSuiteTelemetry({
            appPath: '/project1'
        });
        expect(commonProperties).toEqual({
            appstudio: false,
            'cmn.template': '',
            'cmn.toolsId': 'NO_TOOLS_ID',
            'cmn.deployTarget': 'ABAP',
            'cmn.odataSource': 'ABAP',
            'cmn.appstudio': false,
            'cmn.devspace': '',
            'cmn.internalFeatures': 'external',
            internalVsExternal: 'external',
            'cmn.nodeVersion': expect.any(String),
            'cmn.templateId': '',
            'cmn.templateVersion': '',
            'cmn.appLanguage': 'JavaScript',
            'cmn.applicationType': 'SAP Fiori elements'
        });
    });

    it('telemetryHelperProperties - tsDeployTarget - CAPJava', async () => {
        memfs.vol.fromNestedJSON(
            {
                ['./project1/srv/src/main/resources/application.yaml']: fs.readFileSync(
                    join(__dirname, 'fixtures/cap-java-freestyle/srv/src/main/resources/application.yaml'),
                    'utf-8'
                ),
                ['./project1/package.json']: fs.readFileSync(
                    join(__dirname, 'fixtures/cap-java-freestyle/package.json'),
                    'utf-8'
                ),
                ['./project1/app/freestyle/package.json']: fs.readFileSync(
                    join(__dirname, 'fixtures/cap-java-freestyle/app/freestyle/package.json'),
                    'utf-8'
                ),
                ['./project1/app/freestyle/webapp/manifest.json']: fs.readFileSync(
                    join(__dirname, 'fixtures/cap-java-freestyle/app/freestyle/webapp/manifest.json'),
                    'utf-8'
                )
            },
            '/'
        );

        isAppStudioMock.mockReturnValue(false);
        const commonProperties = await processToolsSuiteTelemetry({
            appPath: '/project1/app/freestyle'
        });
        expect(commonProperties).toEqual({
            appstudio: false,
            'cmn.template': '',
            'cmn.toolsId': 'NO_TOOLS_ID',
            'cmn.deployTarget': 'NO_DEPLOY_CONFIG',
            'cmn.odataSource': 'CAPJava',
            'cmn.appstudio': false,
            'cmn.devspace': '',
            'cmn.internalFeatures': 'external',
            internalVsExternal: 'external',
            'cmn.nodeVersion': expect.any(String),
            'cmn.templateId': '',
            'cmn.templateVersion': '',
            'cmn.appLanguage': '',
            'cmn.applicationType': 'SAPUI5 freestyle'
        });
    });

    it('telemetryHelperProperties - tsDeployTarget - CAPJava - No package.json at project root', async () => {
        memfs.vol.fromNestedJSON(
            {
                ['./project1/srv/src/main/resources/application.yaml']: fs.readFileSync(
                    join(__dirname, 'fixtures/cap-java-freestyle/srv/src/main/resources/application.yaml'),
                    'utf-8'
                ),
                ['./project1/app/freestyle/package.json']: fs.readFileSync(
                    join(__dirname, 'fixtures/cap-java-freestyle/app/freestyle/package.json'),
                    'utf-8'
                ),
                ['./project1/app/freestyle/webapp/manifest.json']: fs.readFileSync(
                    join(__dirname, 'fixtures/cap-java-freestyle/app/freestyle/webapp/manifest.json'),
                    'utf-8'
                )
            },
            '/'
        );

        isAppStudioMock.mockReturnValue(false);
        const commonProperties = await processToolsSuiteTelemetry({
            appPath: '/project1/app/freestyle'
        });
        expect(commonProperties).toEqual({
            appstudio: false,
            'cmn.appstudio': false,
            'cmn.template': '',
            'cmn.toolsId': 'NO_TOOLS_ID',
            'cmn.deployTarget': 'NO_DEPLOY_CONFIG',
            'cmn.odataSource': 'CAPJava',
            'cmn.devspace': '',
            'cmn.internalFeatures': 'external',
            internalVsExternal: 'external',
            'cmn.nodeVersion': expect.any(String),
            'cmn.templateId': '',
            'cmn.templateVersion': '',
            'cmn.appLanguage': '',
            'cmn.applicationType': 'SAPUI5 freestyle'
        });
    });

    it('telemetryHelperProperties - tsDeployTarget - CAPNode', async () => {
        memfs.vol.fromNestedJSON(
            {
                ['/project1/package.json']: fs.readFileSync(
                    join(__dirname, 'fixtures/cap-node-freestyle/package.json'),
                    'utf-8'
                ),
                ['/project1/srv/keep']: fs.readFileSync(
                    join(__dirname, 'fixtures/cap-node-freestyle/srv/keep'),
                    'utf-8'
                ),
                ['/project1/app/freestyle/package.json']: fs.readFileSync(
                    join(__dirname, 'fixtures/cap-node-freestyle/app/freestyle/package.json'),
                    'utf-8'
                ),
                ['/project1/app/freestyle/webapp/manifest.json']: fs.readFileSync(
                    join(__dirname, 'fixtures/cap-node-freestyle/app/freestyle/webapp/manifest.json'),
                    'utf-8'
                )
            },
            '/'
        );

        isAppStudioMock.mockReturnValue(false);
        const commonProperties = await processToolsSuiteTelemetry({
            appPath: '/project1/app/freestyle'
        });
        expect(commonProperties).toEqual({
            appstudio: false,
            'cmn.appstudio': false,
            'cmn.template': '',
            'cmn.toolsId': '5437d5df-446c-4d9e-82ec-addd717c6043',
            'cmn.deployTarget': 'NO_DEPLOY_CONFIG',
            'cmn.odataSource': 'CAPNode',
            'cmn.devspace': '',
            'cmn.internalFeatures': 'external',
            internalVsExternal: 'external',
            'cmn.nodeVersion': expect.any(String),
            'cmn.templateId': '@sap/generator-fiori:basic',
            'cmn.templateVersion': '1.7.1',
            'cmn.appLanguage': '',
            'cmn.applicationType': 'SAPUI5 freestyle'
        });
    });

    it('common telemetry property: reuse library', async () => {
        memfs.vol.fromNestedJSON(
            {
                ['./project1/ui5.yaml']: fs.readFileSync(join(__dirname, 'fixtures/valid-library/ui5.yaml'), 'utf-8'),
                ['./project1/src/manifest.json']: fs.readFileSync(
                    join(__dirname, 'fixtures/valid-library/src/manifest.json'),
                    'utf-8'
                ),
                ['./project1/ui5-deploy.yaml']: fs.readFileSync(
                    join(__dirname, 'fixtures/valid-library/ui5-deploy.yaml'),
                    'utf-8'
                ),
                ['./project1/package.json']: fs.readFileSync(
                    join(__dirname, 'fixtures/valid-library/package.json'),
                    'utf-8'
                )
            },
            '/'
        );

        isAppStudioMock.mockReturnValue(false);
        const commonProperties = await processToolsSuiteTelemetry({
            appPath: '/project1'
        });
        expect(commonProperties).toEqual({
            appstudio: false,
            'cmn.appstudio': false,
            'cmn.template': '',
            'cmn.toolsId': 'NO_TOOLS_ID',
            'cmn.deployTarget': 'UNKNOWN_DEPLOY_CONFIG',
            'cmn.odataSource': 'UNKNOWN',
            'cmn.devspace': '',
            'cmn.internalFeatures': 'external',
            internalVsExternal: 'external',
            'cmn.nodeVersion': expect.any(String),
            'cmn.templateId': '',
            'cmn.templateVersion': '',
            'cmn.appLanguage': '',
            'cmn.applicationType': 'Fiori Reuse'
        });
    });

    it('common telemetry property: adaptation project', async () => {
        memfs.vol.fromNestedJSON(
            {
                ['/project1/ui5.yaml']: fs.readFileSync(join(__dirname, 'fixtures/valid-adaptation/ui5.yaml'), 'utf-8'),
                ['/project1/webapp/manifest.appdescr_variant']: fs.readFileSync(
                    join(__dirname, 'fixtures/valid-adaptation/webapp/manifest.appdescr_variant'),
                    'utf-8'
                ),
                ['/project1/package.json']: fs.readFileSync(
                    join(__dirname, 'fixtures/valid-adaptation/package.json'),
                    'utf-8'
                )
            },
            '/'
        );

        isAppStudioMock.mockReturnValue(false);
        const commonProperties = await processToolsSuiteTelemetry({
            appPath: '/project1'
        });

        expect(commonProperties).toEqual({
            appstudio: false,
            'cmn.appstudio': false,
            'cmn.template': '',
            'cmn.deployTarget': 'NO_DEPLOY_CONFIG',
            'cmn.odataSource': 'ABAP', // New project-access implementation assume ABAP data source if its not CAP
            'cmn.devspace': '',
            'cmn.internalFeatures': 'external',
            internalVsExternal: 'external',
            'cmn.nodeVersion': expect.any(String),
            'cmn.templateId': '@sap/generator-adaptation-project',
            'cmn.templateVersion': '1.1.57',
            'cmn.toolsId': '421a7e6d-4507-4f66-9369-f80bdd3c6877',
            'cmn.appLanguage': '',
            'cmn.applicationType': 'Fiori Adaptation'
        });
    });

    it('common telemetry property: invalid adaptation project', async () => {
        memfs.vol.fromNestedJSON(
            {
                ['/project1/ui5.yaml']: fs.readFileSync(
                    join(__dirname, 'fixtures/invalid-adaptation/ui5.yaml'),
                    'utf-8'
                ),
                ['/project1/webapp/manifest.appdescr_variant']: fs.readFileSync(
                    join(__dirname, 'fixtures/invalid-adaptation/webapp/manifest.appdescr_variant'),
                    'utf-8'
                ),
                ['/project1/package.json']: fs.readFileSync(
                    join(__dirname, 'fixtures/invalid-adaptation/package.json'),
                    'utf-8'
                )
            },
            '/'
        );

        isAppStudioMock.mockReturnValue(false);
        const commonProperties = await processToolsSuiteTelemetry({
            appPath: '/project1'
        });

        expect(commonProperties).toEqual({
            appstudio: false,
            'cmn.appstudio': false,
            'cmn.template': '',
            'cmn.deployTarget': 'NO_DEPLOY_CONFIG',
            'cmn.odataSource': 'ABAP', // New project-access implementation assume ABAP data source if its not CAP
            'cmn.devspace': '',
            'cmn.internalFeatures': 'external',
            internalVsExternal: 'external',
            'cmn.nodeVersion': expect.any(String),
            'cmn.templateId': '',
            'cmn.templateVersion': '',
            'cmn.toolsId': 'NO_TOOLS_ID',
            'cmn.appLanguage': '',
            'cmn.applicationType': 'Fiori Adaptation'
        });
    });
});
