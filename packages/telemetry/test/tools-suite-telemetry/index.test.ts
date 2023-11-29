import type { AxiosResponse } from 'axios';
import * as memfs from 'memfs';
import fs from 'fs';
import { processToolsSuiteTelemetry } from '../../src/tooling-telemetry';
import { ToolingTelemetrySettings } from '../../src/tooling-telemetry/config-state';

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
        // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
        ...(jest.requireActual('@sap-ux/btp-utils') as {}),
        isAppStudio: (): boolean => isAppStudioMock()
    };
});

const axiosGetMock = jest.fn();
jest.mock('axios', () => {
    return {
        // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
        ...(jest.requireActual('axios') as {}),
        get: (): AxiosResponse => axiosGetMock()
    };
});

describe('Tools Suite Telemetry Tests', () => {
    beforeEach(() => {
        memfs.vol.reset();
        ToolingTelemetrySettings.internalFeature = false;
    });

    afterEach(() => {
        delete process.env['TOOLSUITE_INTERNAL'];
        ToolingTelemetrySettings.internalFeature = false;
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

    // Test for the skeleton code that will be implemented in #16043
    it('telemetryHelperProperties - tsTemplate - LROP', async () => {
        memfs.vol.fromNestedJSON(
            {
                ['./project1/README.md']: fs.readFileSync(
                    './test/tools-suite-telemetry/test-project/README_LROPv4.md',
                    'utf-8'
                ),
                ['./project1/package.json']: fs.readFileSync(
                    './test/tools-suite-telemetry/test-project/package.json',
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
                ['./project1/README.md']: fs.readFileSync(
                    './test/tools-suite-telemetry/test-project/README_Form.md',
                    'utf-8'
                ),
                ['./project1/package.json']: fs.readFileSync(
                    './test/tools-suite-telemetry/test-project/package.json',
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
                ['./project1/ui5-deploy.yaml']: fs.readFileSync(
                    './test/tools-suite-telemetry/test-project/ui5-deploy.cf.yaml',
                    'utf-8'
                ),
                ['./project1/package.json']: fs.readFileSync(
                    './test/tools-suite-telemetry/test-project/package.json',
                    'utf-8'
                ),
                ['./project1/webapp/manifest.json']: fs.readFileSync(
                    './test/tools-suite-telemetry/test-project/webapp/manifest.json',
                    'utf-8'
                ),
                ['./project1/webapp/Component.ts']: fs.readFileSync(
                    './test/tools-suite-telemetry/test-project/webapp/Component.ts',
                    'utf-8'
                ),
                ['./project1/tsconfig.json']: fs.readFileSync(
                    './test/tools-suite-telemetry/test-project/tsconfig.json',
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
                    './test/tools-suite-telemetry/test-abap-project/package.json',
                    'utf-8'
                ),
                ['./project1/webapp/Component.js']: fs.readFileSync(
                    './test/tools-suite-telemetry/test-abap-project/webapp/Component.js',
                    'utf-8'
                ),
                ['./project1/ui5-deploy.yaml']: fs.readFileSync(
                    './test/tools-suite-telemetry/test-project/ui5-deploy.abap.yaml',
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
                    './test/tools-suite-telemetry/cap-java-1/srv/src/main/resources/application.yaml',
                    'utf-8'
                ),
                ['./project1/package.json']: fs.readFileSync(
                    './test/tools-suite-telemetry/cap-java-1/package.json',
                    'utf-8'
                )
            },
            '/'
        );

        isAppStudioMock.mockReturnValue(false);
        const commonProperties = await processToolsSuiteTelemetry({
            appPath: '/project1/app/test-app'
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
                    './test/tools-suite-telemetry/cap-java-1/srv/src/main/resources/application.yaml',
                    'utf-8'
                )
            },
            '/'
        );

        isAppStudioMock.mockReturnValue(false);
        const commonProperties = await processToolsSuiteTelemetry({
            appPath: '/project1/app/test-app'
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
                ['./project1/package.json']: fs.readFileSync(
                    './test/tools-suite-telemetry/cap-nodejs-1/package.json',
                    'utf-8'
                ),
                ['./project1/app/test-app/package.json']: fs.readFileSync(
                    './test/tools-suite-telemetry/cap-nodejs-1/app/test-app/package.json',
                    'utf-8'
                ),
                ['./project1/app/test-app/webapp/manifest.json']: fs.readFileSync(
                    './test/tools-suite-telemetry/cap-nodejs-1/app/test-app/webapp/manifest.json',
                    'utf-8'
                )
            },
            '/'
        );

        isAppStudioMock.mockReturnValue(false);
        const commonProperties = await processToolsSuiteTelemetry({
            appPath: '/project1/app/test-app'
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
                ['./project1/ui5.yaml']: fs.readFileSync('./test/tools-suite-telemetry/reuse-lib/ui5.yaml', 'utf-8'),
                ['./project1/ui5-deploy.yaml']: fs.readFileSync(
                    './test/tools-suite-telemetry/reuse-lib/ui5-deploy.yaml',
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
                ['./project1/.adp/config.json']: fs.readFileSync(
                    './test/tools-suite-telemetry/adaptation-project/config.json',
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
            'cmn.deployTarget': 'NO_DEPLOY_CONFIG',
            'cmn.odataSource': 'UNKNOWN',
            'cmn.devspace': '',
            'cmn.internalFeatures': 'external',
            internalVsExternal: 'external',
            'cmn.nodeVersion': expect.any(String),
            'cmn.templateId': '',
            'cmn.templateVersion': '',
            'cmn.appLanguage': '',
            'cmn.applicationType': 'Fiori Adaptation'
        });
    });
});
