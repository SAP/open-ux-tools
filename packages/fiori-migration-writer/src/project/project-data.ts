/**
 * Helper functions for preparing project and service data structures
 */

import { SapUiLibs } from '../index.js';
import { defaultMinUi5Version, minUi5VersionV4Template } from '@sap-ux/ui5-info';
import { getManifestVersion } from '@sap-ux/ui5-application-writer';
import { getUI5Version, stripSpaces, buildSapClientParam } from '../utils/index.js';
import type { ImportProjectInfo, ProjectMigrate, Service } from '../types.js';
import { DatasourceType, ODataVersion } from '../types.js';

/**
 * Prepare sanitized project names and namespaces
 *
 * @param moduleName
 * @param namespace
 */
export function prepareSanitizedNames(
    moduleName: string,
    namespace: string
): {
    sanitizedProjectName: string;
    sanitizedNamespace: string;
    fullyQualifiedProjectName: string;
    fullyQualifiedProjectNameAMD: string;
} {
    const sanitizedProjectName = stripSpaces(moduleName);
    const sanitizedNamespace = stripSpaces(namespace);
    const fullyQualifiedProjectName = [sanitizedNamespace, sanitizedProjectName].filter((x) => !!x).join('.');
    const fullyQualifiedProjectNameAMD = [sanitizedNamespace || '', sanitizedProjectName].filter((x) => !!x).join('/');

    return {
        sanitizedProjectName,
        sanitizedNamespace,
        fullyQualifiedProjectName,
        fullyQualifiedProjectNameAMD
    };
}

/**
 * Generate unique SAP UI libraries string
 *
 * @param isSAPApp
 * @param floorPlan
 * @param sapLibs
 */
export function generateSapUiLibsString(
    isSAPApp: boolean,
    floorPlan: string,
    sapLibs: string
): { sapUiLibs: string; baseUiLibsStr: string } {
    const baseUiLibsStr: string = isSAPApp ? SapUiLibs.SAPApp : SapUiLibs[floorPlan] || SapUiLibs.generic;

    const sapUiLibs = baseUiLibsStr
        .concat(sapLibs ? ',' + sapLibs : '')
        .replace(/ /g, '')
        .split(',')
        .filter((v, i, a) => a.indexOf(v) === i)
        .join(', '); // Generate unique string of libs, handling empty strings

    return { sapUiLibs, baseUiLibsStr };
}

/**
 * Configuration for creating project data
 */
export interface CreateProjectDataConfig {
    projectInfo: ImportProjectInfo;
    semanticObject: string;
    appMigratorSrcComponentToReplace: string | undefined;
    fullyQualifiedProjectName: string;
    fullyQualifiedProjectNameAMD: string;
    sapUiLibs: string;
    ui5Theme: string;
    projectUI5Version: string;
    manifestUI5Version: string | undefined;
    neoAppUI5Version: string | undefined;
    enableTypeScript?: boolean;
}

/**
 * Create ProjectMigrate data structure
 *
 * @param config - Configuration object containing all required parameters
 * @returns Project migration data structure
 */
export function createProjectData(config: CreateProjectDataConfig): ProjectMigrate {
    const {
        projectInfo,
        semanticObject,
        appMigratorSrcComponentToReplace,
        fullyQualifiedProjectName,
        fullyQualifiedProjectNameAMD,
        sapUiLibs,
        ui5Theme,
        projectUI5Version,
        manifestUI5Version,
        neoAppUI5Version,
        enableTypeScript = false
    } = config;
    const {
        isSAPApp = false,
        moduleName,
        moduleDescription,
        mainService,
        odataVersion,
        mainEntity,
        appTitle,
        localUI5Version,
        type
    } = projectInfo;

    return {
        targetFolder: '',
        addDeployConfig: false,
        name: moduleName,
        namespace: fullyQualifiedProjectName,
        title: appTitle,
        description: moduleDescription,
        ui5Theme: ui5Theme,
        ui5Version: projectUI5Version,
        minSupportedUI5Version: odataVersion === ODataVersion.v4 ? minUi5VersionV4Template : defaultMinUi5Version,
        localUI5Version: projectUI5Version.length > 0 ? projectUI5Version : (localUI5Version as string),
        manifestUI5Version,
        neoAppUI5Version,
        sapux: !isSAPApp,
        skipAnnotations: true,
        enableCodeAssist: false,
        enableEslint: false,
        enableTypeScript,
        // Migrations Extensions
        flpAppId: semanticObject,
        entityConfig: { mainEntity: { entityName: mainEntity as string } },
        semanticObject: semanticObject || '',
        appMigratorSrcComponentToReplace,
        mainDatasourceName: mainService,
        mainDataSource: mainService,
        projectTitle: appTitle,
        projectDescription: moduleDescription,
        fullyQualifiedProjectName,
        fullyQualifiedProjectNameAMD: fullyQualifiedProjectNameAMD.split('.').join('/'),
        manifestVersion: getManifestVersion(projectUI5Version),
        sapUiLibs,
        type
    };
}

/**
 * Create Service data structure
 *
 * @param projectInfo
 */
export function createServiceData(projectInfo: ImportProjectInfo): Service {
    const { baseUri, sapClient, scp, destination, mainServiceURI, odataVersion } = projectInfo;

    return {
        host: baseUri as string,
        client: sapClient,
        scp: scp,
        destination: destination || '',
        servicePath: mainServiceURI || '',
        edmx: '',
        annotations: [],
        version: odataVersion,
        source: DatasourceType.URL
    };
}

/**
 * Prepare all data structures needed for migration
 * Consolidates project data, service data, and UI5 lib string generation
 *
 * @param projectInfo
 * @param semanticObject
 * @param appMigratorSrcComponentToReplace
 * @param ui5Theme
 * @param enableTypeScript
 */
export function prepareProjectAndServiceData(
    projectInfo: ImportProjectInfo,
    semanticObject: string,
    appMigratorSrcComponentToReplace: string | undefined,
    ui5Theme: string,
    enableTypeScript = false
): {
    sanitizedProjectName: string;
    sanitizedNamespace: string;
    fullyQualifiedProjectName: string;
    fullyQualifiedProjectNameAMD: string;
    sapUiLibs: string;
    baseUiLibsStr: string;
    projectUI5Version: string;
    sapClientParam: string;
    projectData: ProjectMigrate;
    serviceData: Service;
} {
    const {
        moduleName,
        namespace = '',
        isSAPApp = false,
        floorPlan = '',
        sapLibs = '',
        sapClient,
        ui5Version
    } = projectInfo;

    // Prepare sanitized names
    const { sanitizedProjectName, sanitizedNamespace, fullyQualifiedProjectName, fullyQualifiedProjectNameAMD } =
        prepareSanitizedNames(moduleName, namespace);

    // Generate SAP UI libs string
    const { sapUiLibs, baseUiLibsStr } = generateSapUiLibsString(isSAPApp, floorPlan, sapLibs);

    // Get project UI5 version
    const projectUI5Version = getUI5Version(ui5Version || '');

    // Get SAP client param
    const sapClientParam = buildSapClientParam(sapClient);

    // Create project data structure
    const projectData = createProjectData({
        projectInfo,
        semanticObject,
        appMigratorSrcComponentToReplace,
        fullyQualifiedProjectName,
        fullyQualifiedProjectNameAMD,
        sapUiLibs,
        ui5Theme,
        projectUI5Version,
        manifestUI5Version: projectInfo.manifestUI5Version,
        neoAppUI5Version: projectInfo.neoAppUI5Version,
        enableTypeScript
    });

    // Create service data structure
    const serviceData = createServiceData(projectInfo);

    return {
        sanitizedProjectName,
        sanitizedNamespace,
        fullyQualifiedProjectName,
        fullyQualifiedProjectNameAMD,
        sapUiLibs,
        baseUiLibsStr,
        projectUI5Version,
        sapClientParam,
        projectData,
        serviceData
    };
}
