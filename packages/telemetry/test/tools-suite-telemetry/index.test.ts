import type { AxiosResponse } from 'axios';
import * as memfs from 'memfs';
import { processToolsSuiteTelemetry, getIdeType } from '../../src/tooling-telemetry';
import { ToolingTelemetrySettings } from '../../src/tooling-telemetry/config-state';
import fs from 'node:fs';
import { join } from 'node:path';
import { CommandRunner } from '@sap-ux/nodejs-utils';

jest.mock('fs', () => {
    const fs1 = jest.requireActual('fs');
    // eslint-disable-next-line  @typescript-eslint/no-require-imports
    const Union = require('unionfs').Union;
    // eslint-disable-next-line  @typescript-eslint/no-require-imports
    const vol = require('memfs').vol;
    const memfs = new Union().use(fs1).use(vol as unknown as typeof fs);
    memfs.realpath = fs1.realpath;
    memfs.realpathSync = fs1.realpathSync;
    return memfs;
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

    beforeAll(() => {
        jest.clearAllMocks();
        jest.resetAllMocks();
        jest.restoreAllMocks();
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
            'cmn.nodeVersion': expect.any(String),
            'cmn.ideType': expect.any(String)
        });
    });

    it('Node version cannot be determined', async () => {
        const cmdRunnerSpy = jest.spyOn(CommandRunner.prototype, 'run').mockImplementation(() => {
            throw new Error('Cannot determine Node version');
        });
        isAppStudioMock.mockReturnValue(false);
        const commonProperties = await processToolsSuiteTelemetry(undefined);
        expect(commonProperties).toEqual({
            appstudio: false,
            'cmn.appstudio': false,
            'cmn.devspace': '',
            'cmn.internalFeatures': 'external',
            internalVsExternal: 'external',
            'cmn.nodeVersion': 'unknown',
            'cmn.ideType': expect.any(String)
        });
        expect(cmdRunnerSpy).toHaveBeenCalledWith('node', ['-v']);
        cmdRunnerSpy.mockRestore();
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
            'cmn.nodeVersion': expect.any(String),
            'cmn.ideType': 'appstudio'
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
            'cmn.nodeVersion': expect.any(String),
            'cmn.ideType': 'appstudio'
        });

        commonProperties = await processToolsSuiteTelemetry(undefined);
        expect(commonProperties).toEqual({
            appstudio: true,
            internalVsExternal: 'external',
            'cmn.appstudio': true,
            'cmn.devspace': 'SAP Fiori',
            'cmn.internalFeatures': 'external',
            'cmn.nodeVersion': expect.any(String),
            'cmn.ideType': 'appstudio'
        });

        ToolingTelemetrySettings.internalFeature = true;
        commonProperties = await processToolsSuiteTelemetry(undefined);
        expect(commonProperties).toEqual({
            appstudio: true,
            internalVsExternal: 'internal',
            'cmn.appstudio': true,
            'cmn.devspace': 'SAP Fiori',
            'cmn.internalFeatures': 'internal',
            'cmn.nodeVersion': expect.any(String),
            'cmn.ideType': 'appstudio'
        });

        ToolingTelemetrySettings.internalFeature = false;
        commonProperties = await processToolsSuiteTelemetry(undefined);
        expect(commonProperties).toEqual({
            appstudio: true,
            internalVsExternal: 'external',
            'cmn.appstudio': true,
            'cmn.devspace': 'SAP Fiori',
            'cmn.internalFeatures': 'external',
            'cmn.nodeVersion': expect.any(String),
            'cmn.ideType': 'appstudio'
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
            'cmn.applicationType': 'SAP Fiori elements',
            'cmn.ideType': expect.any(String)
        });
    });

    it('telemetryHelperProperties - tsTemplate - Form Object Object Page', async () => {
        memfs.vol.fromNestedJSON(
            {
                ['/project1/.appGenInfo.json']: fs.readFileSync(
                    join(__dirname, 'fixtures/fiori_elements/.appGenInfo.json'),
                    'utf-8'
                ),
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
            'cmn.template': 'Form Entry Object Page V4',
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
            'cmn.applicationType': 'SAP Fiori elements',
            'cmn.ideType': expect.any(String)
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
            'cmn.applicationType': 'SAP Fiori elements',
            'cmn.ideType': expect.any(String)
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
            'cmn.applicationType': 'SAP Fiori elements',
            'cmn.ideType': expect.any(String)
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
            'cmn.applicationType': 'SAPUI5 freestyle',
            'cmn.ideType': expect.any(String)
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
            'cmn.applicationType': 'SAPUI5 freestyle',
            'cmn.ideType': expect.any(String)
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
            'cmn.applicationType': 'SAPUI5 freestyle',
            'cmn.ideType': expect.any(String)
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
            'cmn.applicationType': 'Fiori Reuse',
            'cmn.ideType': expect.any(String)
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
            'cmn.applicationType': 'Fiori Adaptation',
            'cmn.ideType': expect.any(String)
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
            'cmn.applicationType': 'Fiori Adaptation',
            'cmn.ideType': expect.any(String)
        });
    });
});

describe('getIdeType', () => {
    const originalEnv = process.env;

    beforeEach(() => {
        process.env = { ...originalEnv };
        // Clear all VSCode-related env vars
        delete process.env.VSCODE_PID;
        delete process.env.VSCODE_CWD;
        delete process.env.TERM_PROGRAM;
        delete process.env.CURSOR_TRACE_ID;
        delete process.env.CODE_SERVER_SESSION;
        delete process.env.VSCODE_APPNAME;
    });

    afterAll(() => {
        process.env = originalEnv;
    });

    it('should return "appstudio" when running in SAP Business Application Studio', () => {
        isAppStudioMock.mockReturnValue(true);
        expect(getIdeType()).toBe('appstudio');
    });

    it('should return "vscode" when VSCODE_PID is set', () => {
        isAppStudioMock.mockReturnValue(false);
        process.env.VSCODE_PID = '12345';
        expect(getIdeType()).toBe('vscode');
    });

    it('should return "vscode" when TERM_PROGRAM is vscode', () => {
        isAppStudioMock.mockReturnValue(false);
        process.env.TERM_PROGRAM = 'vscode';
        expect(getIdeType()).toBe('vscode');
    });

    it('should return "vscode-insiders" when VSCODE_CWD contains "code - insiders"', () => {
        isAppStudioMock.mockReturnValue(false);
        process.env.VSCODE_PID = '12345';
        process.env.VSCODE_CWD = '/Applications/Visual Studio Code - Insiders.app/Contents';
        expect(getIdeType()).toBe('vscode-insiders');
    });

    it('should return "vscode-insiders" when VSCODE_CWD contains Windows-style "code insiders" path', () => {
        isAppStudioMock.mockReturnValue(false);
        process.env.VSCODE_PID = '12345';
        process.env.VSCODE_CWD = 'C:\\Users\\user\\AppData\\Local\\Programs\\Microsoft VS Code Insiders\\resources\\app';
        expect(getIdeType()).toBe('vscode-insiders');
    });

    it('should return "vscode-insiders" when TERM_PROGRAM is vscode-insiders', () => {
        isAppStudioMock.mockReturnValue(false);
        process.env.TERM_PROGRAM = 'vscode-insiders';
        expect(getIdeType()).toBe('vscode-insiders');
    });

    it('should return "cursor" when CURSOR_TRACE_ID is set', () => {
        isAppStudioMock.mockReturnValue(false);
        process.env.VSCODE_PID = '12345';
        process.env.CURSOR_TRACE_ID = 'some-trace-id';
        expect(getIdeType()).toBe('cursor');
    });

    it('should return "cursor" when VSCODE_CWD contains "cursor"', () => {
        isAppStudioMock.mockReturnValue(false);
        process.env.VSCODE_PID = '12345';
        process.env.VSCODE_CWD = '/Applications/Cursor.app/Contents';
        expect(getIdeType()).toBe('cursor');
    });

    it('should return "windsurf" when VSCODE_CWD contains "windsurf"', () => {
        isAppStudioMock.mockReturnValue(false);
        process.env.VSCODE_PID = '12345';
        process.env.VSCODE_CWD = '/Applications/Windsurf.app/Contents';
        expect(getIdeType()).toBe('windsurf');
    });

    it('should return "windsurf" when VSCODE_CWD contains "codeium"', () => {
        isAppStudioMock.mockReturnValue(false);
        process.env.VSCODE_PID = '12345';
        process.env.VSCODE_CWD = '/home/user/.codeium/windsurf';
        expect(getIdeType()).toBe('windsurf');
    });

    it('should return "unknown" when no VSCode environment is detected (CLI/MCP)', () => {
        isAppStudioMock.mockReturnValue(false);
        // No VSCode-related env vars set - simulates Node.js CLI or MCP server
        expect(getIdeType()).toBe('unknown');
    });

    it('should return "unknown" when only unrelated TERM_PROGRAM is set', () => {
        isAppStudioMock.mockReturnValue(false);
        process.env.TERM_PROGRAM = 'iTerm.app';
        expect(getIdeType()).toBe('unknown');
    });

    it('should return "antigravity" when VSCODE_CWD contains "antigravity"', () => {
        isAppStudioMock.mockReturnValue(false);
        process.env.VSCODE_PID = '12345';
        process.env.VSCODE_CWD = '/Applications/Antigravity.app/Contents';
        expect(getIdeType()).toBe('antigravity');
    });

    it('should return "trae" when VSCODE_CWD contains "trae"', () => {
        isAppStudioMock.mockReturnValue(false);
        process.env.VSCODE_PID = '12345';
        process.env.VSCODE_CWD = '/Applications/Trae.app/Contents';
        expect(getIdeType()).toBe('trae');
    });

    it('should return "kiro" when VSCODE_CWD contains "kiro"', () => {
        isAppStudioMock.mockReturnValue(false);
        process.env.VSCODE_PID = '12345';
        process.env.VSCODE_CWD = '/Applications/Kiro.app/Contents';
        expect(getIdeType()).toBe('kiro');
    });

    it('should return "vscodium" when VSCODE_CWD contains "vscodium"', () => {
        isAppStudioMock.mockReturnValue(false);
        process.env.VSCODE_PID = '12345';
        process.env.VSCODE_CWD = '/Applications/VSCodium.app/Contents';
        expect(getIdeType()).toBe('vscodium');
    });

    it('should return "vscodium" when VSCODE_CWD contains "codium"', () => {
        isAppStudioMock.mockReturnValue(false);
        process.env.VSCODE_PID = '12345';
        process.env.VSCODE_CWD = '/usr/share/codium/bin';
        expect(getIdeType()).toBe('vscodium');
    });

    it('should return "code-server" when VSCODE_CWD contains "code-server"', () => {
        isAppStudioMock.mockReturnValue(false);
        process.env.VSCODE_PID = '12345';
        process.env.VSCODE_CWD = '/home/user/.local/lib/code-server';
        expect(getIdeType()).toBe('code-server');
    });

    it('should return "code-server" when CODE_SERVER_SESSION is set', () => {
        isAppStudioMock.mockReturnValue(false);
        process.env.VSCODE_PID = '12345';
        process.env.CODE_SERVER_SESSION = 'session-id';
        expect(getIdeType()).toBe('code-server');
    });

    it('should return "vscode" when VSCODE_PID is set with a non-matching VSCODE_CWD', () => {
        isAppStudioMock.mockReturnValue(false);
        process.env.VSCODE_PID = '12345';
        process.env.VSCODE_CWD = '/opt/editors/my-custom-vscode/';
        expect(getIdeType()).toBe('vscode');
    });

    it('should return "cursor" when VSCODE_APPNAME is "Cursor"', () => {
        isAppStudioMock.mockReturnValue(false);
        process.env.VSCODE_PID = '12345';
        process.env.VSCODE_APPNAME = 'Cursor';
        expect(getIdeType()).toBe('cursor');
    });

    it('should return "windsurf" when VSCODE_APPNAME is "Windsurf"', () => {
        isAppStudioMock.mockReturnValue(false);
        process.env.VSCODE_PID = '12345';
        process.env.VSCODE_APPNAME = 'Windsurf';
        expect(getIdeType()).toBe('windsurf');
    });

    it('should return "vscode-insiders" when VSCODE_APPNAME contains "insiders"', () => {
        isAppStudioMock.mockReturnValue(false);
        process.env.VSCODE_PID = '12345';
        process.env.VSCODE_APPNAME = 'Visual Studio Code - Insiders';
        expect(getIdeType()).toBe('vscode-insiders');
    });

    it('should not false-positive on "insiders" in an unrelated VSCODE_CWD path', () => {
        isAppStudioMock.mockReturnValue(false);
        process.env.VSCODE_PID = '12345';
        process.env.VSCODE_CWD = '/home/user/projects/insiders-project';
        expect(getIdeType()).toBe('vscode');
    });
});
