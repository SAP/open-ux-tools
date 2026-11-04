import {
    createProjectData,
    createServiceData,
    generateSapUiLibsString,
    prepareProjectAndServiceData,
    prepareSanitizedNames
} from '../../../src/project/project-data.js';
import { DatasourceType, ODataVersion, type ImportProjectInfo } from '../../../src/migration-types.js';

function createProjectInfo(overrides: Partial<ImportProjectInfo> = {}): ImportProjectInfo {
    return {
        sapLibs: 'sap.m, custom.library, sap.m',
        rootPath: '/projects/source-app',
        moduleName: 'source app',
        moduleDescription: 'A source application',
        sapux: false,
        scp: false,
        destination: 'SOURCE_DESTINATION',
        appTitle: 'Source App',
        appVersion: '1.0.0',
        sapClient: '100',
        backends: [],
        floorPlan: 'V2_LIST_REPORT',
        namespace: 'example namespace',
        baseUri: 'https://example.test',
        mainService: 'MainService',
        mainServiceURI: '/sap/opu/odata/MainService/',
        odataVersion: ODataVersion.v2,
        mainEntity: 'MainEntity',
        ui5Version: '1.120.0',
        localUI5Version: '1.108.0',
        webappPath: '/projects/source-app/webapp',
        hostname: 'example.test',
        isFioriToolsProject: false,
        ...overrides
    };
}

describe('project data', () => {
    it('sanitizes project names and produces dot and AMD namespaces', () => {
        expect(prepareSanitizedNames('source app', 'example namespace')).toEqual({
            sanitizedProjectName: 'sourceapp',
            sanitizedNamespace: 'examplenamespace',
            fullyQualifiedProjectName: 'examplenamespace.sourceapp',
            fullyQualifiedProjectNameAMD: 'examplenamespace/sourceapp'
        });
        expect(prepareSanitizedNames('source app', '')).toMatchObject({
            fullyQualifiedProjectName: 'sourceapp',
            fullyQualifiedProjectNameAMD: 'sourceapp'
        });
    });

    it('selects base libraries and removes duplicate additional libraries', () => {
        expect(generateSapUiLibsString(false, 'V2_LIST_REPORT', 'sap.m, custom.library, sap.m')).toEqual({
            sapUiLibs:
                'sap.m, sap.ushell, sap.ui.core, sap.f, sap.ui.comp, sap.ui.table, sap.suite.ui.generic.template, sap.ui.generic.app, custom.library',
            baseUiLibsStr:
                'sap.m, sap.ushell, sap.ui.core, sap.f, sap.ui.comp, sap.ui.table, sap.suite.ui.generic.template, sap.ui.generic.app'
        });
        expect(generateSapUiLibsString(true, 'V2_LIST_REPORT', '')).toMatchObject({
            sapUiLibs: 'sap.f, sap.m, sap.ui.comp, sap.ui.core, sap.ui.generic.app, sap.ui.table, sap.ushell'
        });
    });

    it('creates project and service data from the detected source project', () => {
        const projectInfo = createProjectInfo({ odataVersion: ODataVersion.v4, ui5Version: '' });
        const projectData = createProjectData({
            projectInfo,
            semanticObject: 'Source-display',
            appMigratorSrcComponentToReplace: 'legacy.Component',
            fullyQualifiedProjectName: 'examplenamespace.sourceapp',
            fullyQualifiedProjectNameAMD: 'examplenamespace/sourceapp',
            sapUiLibs: 'sap.m',
            ui5Theme: 'sap_horizon',
            projectUI5Version: '',
            manifestUI5Version: '1.120.0',
            neoAppUI5Version: '1.120.0',
            enableTypeScript: true
        });

        expect(projectData).toMatchObject({
            name: 'source app',
            namespace: 'examplenamespace.sourceapp',
            localUI5Version: '1.108.0',
            enableTypeScript: true,
            semanticObject: 'Source-display',
            mainDatasourceName: 'MainService',
            fullyQualifiedProjectNameAMD: 'examplenamespace/sourceapp'
        });
        expect(createServiceData(projectInfo)).toEqual({
            host: 'https://example.test',
            client: '100',
            scp: false,
            destination: 'SOURCE_DESTINATION',
            servicePath: '/sap/opu/odata/MainService/',
            edmx: '',
            annotations: [],
            version: ODataVersion.v4,
            source: DatasourceType.URL
        });
    });

    it('prepares all migration data from one source project', () => {
        const result = prepareProjectAndServiceData(
            createProjectInfo({ odataVersion: ODataVersion.v4 }),
            'Source-display',
            undefined,
            'sap_horizon',
            true
        );

        expect(result).toMatchObject({
            sanitizedProjectName: 'sourceapp',
            sanitizedNamespace: 'examplenamespace',
            fullyQualifiedProjectName: 'examplenamespace.sourceapp',
            fullyQualifiedProjectNameAMD: 'examplenamespace/sourceapp',
            projectUI5Version: '1.120.0',
            sapClientParam: 'sap-client=100',
            projectData: { enableTypeScript: true, semanticObject: 'Source-display' },
            serviceData: { source: DatasourceType.URL, version: ODataVersion.v4 }
        });
    });
});
