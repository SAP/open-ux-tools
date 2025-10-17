import type { Annotations, ServiceProvider } from '@sap-ux/axios-extension';
import * as capConfigWriter from '@sap-ux/cap-config-writer';
import { writeApplicationInfoSettings } from '@sap-ux/fiori-tools-settings';
import type { DebugOptions, FioriOptions } from '@sap-ux/launch-config';
import { createLaunchConfig } from '@sap-ux/launch-config';
import type { CapService } from '@sap-ux/odata-service-inquirer';
import { DatasourceType, OdataVersion } from '@sap-ux/odata-service-inquirer';
import memFs from 'mem-fs';
import type { Editor } from 'mem-fs-editor';
import memFsEditor from 'mem-fs-editor';
import { join } from 'node:path';
import { FloorplanFE, FloorplanFF } from '../../../src/types';
import { ApiHubType, SapSystemSourceType, minUi5VersionForPageBuildingBlock } from '../../../src/types/constants';
import {
    convertCapRuntimeToCapProjectType,
    getCdsUi5PluginInfo,
    initI18nFioriAppSubGenerator,
    t
} from '../../../src/utils';
import {
    buildSapClientParam,
    generateLaunchConfig,
    generateToolsId,
    getAnnotations,
    getAppId,
    getCdsAnnotations,
    getMinSupportedUI5Version,
    getODataVersion,
    getReadMeDataSourceLabel,
    getRequiredOdataVersion,
    restoreServiceProviderLoggers
} from '../../../src/utils/common';
import { isAppStudio } from '@sap-ux/btp-utils';
import type { Logger } from '@sap-ux/logger';

const getProjectTypeMock = jest.fn();
jest.mock('@sap-ux/project-access', () => ({
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
    ...(jest.requireActual('@sap-ux/project-access') as object),
    getProjectType: () => getProjectTypeMock()
}));

jest.mock('@sap-ux/fiori-tools-settings', () => ({
    writeApplicationInfoSettings: jest.fn()
}));

jest.mock('@sap-ux/launch-config', () => ({
    createLaunchConfig: jest.fn()
}));

jest.mock('fs', () => {
    const fs = jest.requireActual('fs');
    return {
        ...fs,
        existsSync: jest.fn().mockReturnValue(true)
    };
});

jest.mock('@sap-ux/btp-utils', () => ({
    ...jest.requireActual('@sap-ux/btp-utils'),
    isAppStudio: jest.fn()
}));

const isAppStudioMock = isAppStudio as jest.Mock;

jest.mock('@sap-ux/fiori-generator-shared', () => ({
    ...jest.requireActual('@sap-ux/fiori-generator-shared'),
    generateAppGenInfo: jest.fn()
}));

// rootPath exists only in SBAS
const vscodeMock = {
    workspace: {
        workspaceFolders: [
            { uri: { fsPath: '/1st/workspace/path', scheme: 'file' } },
            { uri: { fsPath: '/2nd/workspace/path', scheme: 'file' } }
        ],
        workspaceFile: undefined,
        getConfiguration: (id: string): object => {
            if (id) {
                return { configurations: [] };
            }
            return {
                update: (): void => {
                    return;
                },
                get: (): void => {
                    return undefined;
                }
            };
        }
    }
};
describe('Test utils', () => {
    beforeAll(async () => {
        await initI18nFioriAppSubGenerator();
        jest.clearAllMocks();
    });
    test('getODataVersion ', async () => {
        const validMetadataV2 =
            '<?xml version="1.0" encoding="utf-8"?><edmx:Edmx Version="1.0" xmlns:edmx="http://schemas.microsoft.com/ado/2007/06/edmx">' +
            '<edmx:DataServices m:DataServiceVersion="2.0"></edmx:DataServices></edmx:Edmx>';
        const validMetadataV4 =
            '<?xml version="1.0" encoding="utf-8"?><edmx:Edmx Version="4.0" xmlns:edmx="http://schemas.microsoft.com/ado/2007/06/edmx">' +
            '<edmx:DataServices m:DataServiceVersion="4.0"></edmx:DataServices></edmx:Edmx>';
        expect(getODataVersion(validMetadataV2)).toEqual(OdataVersion.v2);
        expect(getODataVersion(validMetadataV4)).toEqual(OdataVersion.v4);

        expect(() => getODataVersion('<?xml version="1.0" encoding="utf-8"?>')).toThrow(
            'Application config property: edmx cannot be parsed.'
        );
    });

    test('getAppId', () => {
        const appId = getAppId('testApp', 'a.b.c');
        expect(appId).toBe('a.b.c.testApp');
    });

    test('getMinSupportedUI5Version - LROP v2', () => {
        const minVerson = getMinSupportedUI5Version(OdataVersion.v2, FloorplanFE.FE_LROP);
        expect(minVerson).toBe('1.65.0');
    });

    test('getMinSupportedUI5Version - LROP v4', () => {
        const minVerson = getMinSupportedUI5Version(OdataVersion.v4, FloorplanFE.FE_LROP);
        expect(minVerson).toBe('1.84.0');
    });

    test('getMinSupportedUI5Version - form entry', () => {
        const minVerson = getMinSupportedUI5Version(OdataVersion.v4, FloorplanFE.FE_FEOP);
        expect(minVerson).toBe('1.90.0');
    });

    test('getMinSupportedUI5Version - alp v4', () => {
        let minVerson = getMinSupportedUI5Version(OdataVersion.v4, FloorplanFE.FE_ALP);
        expect(minVerson).toBe('1.90.0');
        minVerson = getMinSupportedUI5Version(OdataVersion.v4, FloorplanFE.FE_ALP);
        expect(minVerson).toBe('1.90.0');
    });

    test('getMinSupportedUI5Version - worklist v4', () => {
        let minVerson = getMinSupportedUI5Version(OdataVersion.v4, FloorplanFE.FE_WORKLIST);
        expect(minVerson).toBe('1.99.0');
        minVerson = getMinSupportedUI5Version(OdataVersion.v4, FloorplanFE.FE_WORKLIST);
        expect(minVerson).toBe('1.99.0');
    });

    test('getMinSupportedUI5Version - OVP', () => {
        let minVerson = getMinSupportedUI5Version(OdataVersion.v4, FloorplanFE.FE_OVP);
        expect(minVerson).toBe('1.96.8');
        minVerson = getMinSupportedUI5Version(OdataVersion.v2, FloorplanFE.FE_OVP);
        expect(minVerson).toBe('1.65.0');
    });

    test('getMinSupportedUI5Version - FPM with page building block enabled returns minimum required version', () => {
        const result = getMinSupportedUI5Version(OdataVersion.v4, FloorplanFE.FE_FPM, { addPageBuildingBlock: true });
        expect(result).toBe(minUi5VersionForPageBuildingBlock);
    });

    test('getMinSupportedUI5Version - FPM with page building block disabled returns minimum version support based on service version', () => {
        const result = getMinSupportedUI5Version(OdataVersion.v4, FloorplanFE.FE_FPM, { addPageBuildingBlock: false });
        expect(result).toBe('1.94.0');
    });

    test('buildSapClientParam', () => {
        const sapClientParam = buildSapClientParam('001');
        expect(sapClientParam).toBe('sap-client=001');
    });

    test('generateToolsId', () => {
        // Basic check of UIID v4 format
        expect(generateToolsId()).toMatch(/^[0-9A-F]{8}-[0-9A-F]{4}-4[0-9A-F]{3}-[89AB][0-9A-F]{3}-[0-9A-F]{12}$/i);
    });

    test('getRequiredOdataVersion', () => {
        expect(getRequiredOdataVersion(FloorplanFE.FE_FPM)).toEqual(OdataVersion.v4);
        expect(getRequiredOdataVersion(FloorplanFF.FF_SIMPLE)).toEqual(undefined);
    });

    test('getCdsUi5PluginInfo', async () => {
        const capCdsInfoMock = {
            hasCdsUi5Plugin: true,
            isCdsUi5PluginEnabled: true,
            hasMinCdsVersion: true,
            isWorkspaceEnabled: false
        };
        const capConfigWriterSpy = jest
            .spyOn(capConfigWriter, 'checkCdsUi5PluginEnabled')
            .mockResolvedValueOnce(capCdsInfoMock);
        expect(await getCdsUi5PluginInfo('/some/cap/path', {} as Editor)).toBe(capCdsInfoMock);
        expect(capConfigWriterSpy).toHaveBeenCalledWith('/some/cap/path', {}, true, undefined);
    }, 10000);

    test('getCdsAnnotations', async () => {
        const projectName = 'projectName';
        const serviceCdsUri = '../../serviceCdsPath';
        const expectedAnnotationCdsContents = `using serviceName as service from '${serviceCdsUri}';`;
        const capService = {
            appPath: 'capAppPath',
            projectPath: 'projectPath',
            serviceCdsPath: 'serviceCdsPath',
            serviceName: 'serviceName'
        };
        const expected = {
            cdsFileContents: expectedAnnotationCdsContents,
            projectPath: 'projectPath',
            appPath: 'capAppPath',
            projectName: 'projectName'
        };
        const result = await getCdsAnnotations(capService, projectName);
        expect(result).toEqual(expected);
    });

    test('convertCapRuntimeToCapType', () => {
        expect(convertCapRuntimeToCapProjectType('Java')).toBe('CAPJava');
        expect(convertCapRuntimeToCapProjectType('Node.js')).toBe('CAPNodejs');
        expect(convertCapRuntimeToCapProjectType()).toBe('CAPNodejs');
    });

    test('should return the correct label for SAP System source type', () => {
        const source = DatasourceType.sapSystem;
        let result = getReadMeDataSourceLabel(source, true);
        const labelDatasourceType = t(`readme.label.datasourceType.${source}`);

        expect(result).toBe(
            `${labelDatasourceType} (${t(`readme.label.sapSystemType.${SapSystemSourceType.ABAP_CLOUD}`)})`
        );

        result = getReadMeDataSourceLabel(source);
        expect(result).toBe(
            `${labelDatasourceType} (${t(`readme.label.sapSystemType.${SapSystemSourceType.ON_PREM}`)})`
        );
    });

    test('should return the correct label for Business Hub source type and API Hub Type Enterprise', () => {
        const source = DatasourceType.businessHub;
        const apiHubType = ApiHubType.apiHubEnterprise;
        const result = getReadMeDataSourceLabel(source, false, apiHubType);
        expect(result).toBe(t('readme.label.datasourceType.apiBusinessHubEnterprise'));
    });

    test('should return the correct datasource label', () => {
        const source = DatasourceType.none;
        const result = getReadMeDataSourceLabel(source);
        expect(result).toEqual('None');
    });

    it('should return the correct annotations', async () => {
        const mockCapService: CapService = {
            appPath: 'appPath',
            projectPath: 'projectPath',
            serviceName: 'serviceName',
            serviceCdsPath: 'serviceCdsPath',
            capType: 'Node.js'
        };
        const mockAnnotations: Annotations = {
            TechnicalName: 'TechnicalName',
            Version: 'Version',
            Definitions: 'Definitions',
            Uri: 'Uri'
        };
        const mockProjectName = 'projectName';

        expect(await getAnnotations(mockProjectName, mockAnnotations, mockCapService)).toEqual({
            cdsFileContents: `using serviceName as service from '../../serviceCdsPath';`,
            projectPath: 'projectPath',
            appPath: 'appPath',
            projectName: 'projectName'
        });
        expect(await getAnnotations(mockProjectName, mockAnnotations)).toEqual({
            technicalName: 'TechnicalName',
            xml: 'Definitions'
        });
        expect(await getAnnotations(mockProjectName)).toEqual(undefined);
    });

    describe('generateLaunchConfig', () => {
        const store = memFs.create();
        const editor = memFsEditor.create(store);
        const mockVsCode = {
            workspace: {
                getConfiguration: jest.fn().mockReturnValue({
                    get: jest.fn().mockReturnValue(true)
                })
            }
        };

        const mockProject = {
            name: 'TestProject',
            targetFolder: join('/path/to/project'),
            flpAppId: 'testAppId'
        };

        const projectPath = join(mockProject.targetFolder, mockProject.name);

        beforeEach(() => {
            jest.clearAllMocks();
        });

        it('should generate correct launch config for OData v2', async () => {
            isAppStudioMock.mockReturnValue(true);
            // Call the function under test
            await generateLaunchConfig(
                {
                    targetFolder: mockProject.targetFolder,
                    projectName: mockProject.name,
                    flpAppId: mockProject.flpAppId,
                    sapClientParam: buildSapClientParam('001'),
                    odataVersion: OdataVersion.v2,
                    datasourceType: 'odataServiceUrl' as DatasourceType
                },
                editor,
                mockVsCode,
                {} as Logger,
                false
            );

            // Assertions
            const expectedDebugOptions: DebugOptions = {
                vscode: mockVsCode,
                addStartCmd: true,
                sapClientParam: 'sap-client=001',
                flpAppId: mockProject.flpAppId,
                flpSandboxAvailable: true,
                isAppStudio: true,
                odataVersion: '2.0',
                writeToAppOnly: false
            };

            const expectedFioriOptions = {
                name: mockProject.name,
                projectRoot: projectPath,
                debugOptions: expectedDebugOptions,
                startFile: undefined
            };

            expect(createLaunchConfig).toHaveBeenCalledWith(projectPath, expectedFioriOptions, editor, {});
            expect(writeApplicationInfoSettings).toHaveBeenCalledWith(projectPath);
        });

        it('should generate correct launch config for OData v4', async () => {
            isAppStudioMock.mockReturnValue(false);
            await generateLaunchConfig(
                {
                    targetFolder: mockProject.targetFolder,
                    projectName: mockProject.name,
                    flpAppId: mockProject.flpAppId,
                    sapClientParam: buildSapClientParam('001'),
                    odataVersion: OdataVersion.v4,
                    datasourceType: 'odataServiceUrl' as DatasourceType,
                    enableVirtualEndpoints: true
                },
                editor,
                mockVsCode,
                {} as Logger,
                true
            );

            const expectedDebugOptions: DebugOptions = {
                addStartCmd: true,
                vscode: mockVsCode,
                sapClientParam: 'sap-client=001',
                flpAppId: 'app-preview',
                flpSandboxAvailable: false,
                isAppStudio: false,
                odataVersion: '4.0',
                writeToAppOnly: true
            };

            const expectedFioriOptions: FioriOptions = {
                name: mockProject.name,
                projectRoot: projectPath,
                debugOptions: expectedDebugOptions,
                startFile: 'test/flp.html'
            };
            expect(createLaunchConfig).toHaveBeenCalledWith(projectPath, expectedFioriOptions, editor, {});
            expect(writeApplicationInfoSettings).toHaveBeenCalledWith(projectPath);
        });

        it('should not set odataVersion if service version is not OData v2 or v4', async () => {
            isAppStudioMock.mockReturnValue(false);
            await generateLaunchConfig(
                {
                    targetFolder: mockProject.targetFolder,
                    projectName: mockProject.name,
                    flpAppId: mockProject.flpAppId,
                    sapClientParam: buildSapClientParam('001'),
                    datasourceType: 'odataServiceUrl' as DatasourceType
                },
                editor,
                mockVsCode,
                {} as Logger
            );

            const expectedDebugOptions: DebugOptions = {
                vscode: mockVsCode,
                sapClientParam: 'sap-client=001',
                addStartCmd: true,
                flpAppId: mockProject.flpAppId,
                flpSandboxAvailable: true,
                isAppStudio: false,
                writeToAppOnly: false
            };

            const expectedFioriOptions: FioriOptions = {
                name: mockProject.name,
                projectRoot: projectPath,
                debugOptions: expectedDebugOptions,
                startFile: undefined
            };

            expect(createLaunchConfig).toHaveBeenCalledWith(projectPath, expectedFioriOptions, editor, {});
            expect(writeApplicationInfoSettings).toHaveBeenCalledWith(projectPath);
        });
    });

    test('restoreServiceProviderLoggers should re-add removed log ref', () => {
        const logger = {
            info: jest.fn(),
            warn: jest.fn(),
            error: jest.fn()
        } as unknown as Logger;

        const serviceProvider = {
            log: {},
            services: {
                service1: { log: {} },
                service2: { log: {} }
            }
        } as unknown as ServiceProvider;

        const restoredServiceProvider = restoreServiceProviderLoggers(logger, serviceProvider);
        expect(restoredServiceProvider?.log).toBe(logger);
        expect((restoredServiceProvider as any)?.services.service1.log).toBe(logger);
        expect((restoredServiceProvider as any)?.services.service2.log).toBe(logger);
    });
});
