import { DirName } from '../project-spec-types.js';
import type {
    Ui5Yaml,
    Ui5MockYaml,
    TemplateData,
    ProjectMigrate,
    Service,
    PackageJsonMigrate,
    ImportProjectInfo,
    HasRootIntent,
    Ui5YamlContext
} from '../types.js';
import { FLOOR_PLAN, ODataVersion } from '../types.js';
import { escapeDoubleQuotes } from '../utils/index.js';

/**
 * Creates Ui5Yaml configuration object
 *
 * @param context - Configuration context containing all necessary parameters
 * @returns Ui5Yaml object
 */
export function createUi5YamlConfig(context: Ui5YamlContext): Ui5Yaml {
    const { projectInfo, moduleName, fullyQualifiedProjectName, ui5Config, backendConfig, libraryConfig } = context;

    // Add sap.fe.templates for OVP yaml libs
    const sapLibsTemp =
        libraryConfig.sapLibs && projectInfo.floorPlan === FLOOR_PLAN.OverviewPageV2
            ? libraryConfig.sapLibs.concat(', sap.fe.templates')
            : libraryConfig.sapLibs;

    return {
        name: moduleName,
        proxyPath: '/sap',
        proxyHost: backendConfig.baseUri as string,
        scp: backendConfig.scp,
        destination: backendConfig.destination,
        destinationInstance: '',
        ui5Version: ui5Config.projectUI5Version,
        localUI5Version: ui5Config.localUI5Version as string,
        ui5Theme: ui5Config.ui5Theme,
        ui5Url:
            ui5Config.ui5Version?.includes('snapshot') && ui5Config.ui5SnapshotUrl
                ? ui5Config.ui5SnapshotUrl
                : ui5Config.ui5VersionRequestInfo.OfficialUrl,
        // add themes to libs and get unique array
        sapUiLibs: sapLibsTemp
            .concat(libraryConfig.baseUiLibsStr ? ',' + libraryConfig.baseUiLibsStr : '')
            .replace(/ /g, '')
            .split(',')
            .filter((v, i, a) => a.indexOf(v) === i)
            .concat(libraryConfig.supportedThemes ?? [])
            .filter((v, i, a) => a.indexOf(v) === i)
            .filter((v) => v.trim().length > 0), // remove empty strings
        apiHubApiKey: '',
        client: backendConfig.sapClient,
        appId: fullyQualifiedProjectName
    };
}

/**
 * Creates TemplateData object for template rendering
 *
 * @param projectData - Project data
 * @param serviceData - Service data
 * @param packageJson - Package.json configuration
 * @param ui5Yaml - Ui5Yaml configuration
 * @param semanticObject - Semantic object
 * @param fullyQualifiedProjectName - Fully qualified project name
 * @param fullyQualifiedProjectNameAMD - Fully qualified project name in AMD format
 * @param sapUiLibs - SAP UI libraries
 * @param ui5Theme - UI5 theme
 * @param appIntent - App intent
 * @param appMockIntent - Mock app intent
 * @param projectInfo - Project information
 * @param hasRootIntent - Whether has root intent
 * @returns TemplateData object
 */

/**
 * Configuration for creating template data
 */
export interface CreateTemplateDataConfig {
    projectData: Partial<ProjectMigrate>;
    serviceData: Partial<Service>;
    packageJson: PackageJsonMigrate;
    ui5Yaml: Ui5Yaml;
    semanticObject: string;
    fullyQualifiedProjectName: string;
    fullyQualifiedProjectNameAMD: string;
    sapUiLibs: string;
    ui5Theme: string;
    appIntent: string;
    appMockIntent: string | undefined;
    projectInfo: ImportProjectInfo;
    hasRootIntent: HasRootIntent | undefined;
}

/**
 * Create TemplateData object from configuration
 *
 * @param config - Configuration object containing all required parameters
 * @returns TemplateData object
 */
export function createTemplateData(config: CreateTemplateDataConfig): TemplateData {
    const {
        projectData,
        serviceData,
        packageJson,
        ui5Yaml,
        semanticObject,
        fullyQualifiedProjectName,
        fullyQualifiedProjectNameAMD,
        sapUiLibs,
        ui5Theme,
        appIntent,
        appMockIntent,
        projectInfo,
        hasRootIntent
    } = config;
    return {
        project: projectData,
        service: serviceData,
        packageJson: packageJson,
        ui5Yaml: ui5Yaml,
        SemanticObject: semanticObject,
        escapeDoubleQuotes,
        fullyQualifiedProjectName,
        fullyQualifiedProjectNameAMD: fullyQualifiedProjectNameAMD.split('.').join('/'),
        appId: fullyQualifiedProjectName,
        sapUiLibs,
        ui5Theme: ui5Theme,
        appIntent: appIntent?.replace('#', ''),
        appMockIntent: appMockIntent?.replace('#', ''),
        mainServiceFsPath: projectInfo.mainServiceFsPath,
        hasRootIntent
    };
}

/**
 * Configuration for adding V4 mock middleware
 */
export interface AddV4MockMiddlewareConfig {
    templateData: TemplateData;
    serviceData: Partial<Service>;
    projectInfo: ImportProjectInfo;
    projectData: Partial<ProjectMigrate>;
    ui5Version: string | undefined;
    ui5SnapshotUrl: string;
    ui5VersionRequestInfo: any;
    ui5Yaml: Ui5Yaml;
}

/**
 * Adds V4 mock middleware configuration to template data
 *
 * @param config - Configuration object containing all required parameters
 */
export function addV4MockMiddleware(config: AddV4MockMiddlewareConfig): void {
    const {
        templateData,
        serviceData,
        projectInfo,
        projectData,
        ui5Version,
        ui5SnapshotUrl,
        ui5VersionRequestInfo,
        ui5Yaml
    } = config;
    if (serviceData.version === ODataVersion.v4) {
        const metadataPath = `./${projectInfo.webappPath}/${projectInfo.mainServiceFsPath}`;
        const mockdataPath = `./${projectInfo.webappPath}/${DirName.LocalService}/mockdata`;

        // Create the v4 mock middleware config
        const ui5MockYaml: Ui5MockYaml = {
            name: projectData.name || '',
            ui5Url: ui5Version?.includes('snapshot') ? ui5SnapshotUrl : ui5VersionRequestInfo.OfficialUrl,
            ui5Version: ui5Yaml.ui5Version,
            servicePath: `${serviceData.servicePath?.replace(/\/$/, '')}`, // Mockserver fails to load metadata if trailing '/'
            metadataXmlPath: `${metadataPath}`,
            mockdataRootPath: `${mockdataPath}`,
            generateMockData: true
        };

        templateData.ui5Yaml = { ...templateData.ui5Yaml, ...ui5MockYaml };
    }
}

/**
 * Sets the appId property on the project data
 *
 * @param templateData - Template data containing project data
 * @param fullyQualifiedProjectName - Fully qualified project name
 */
export function setProjectAppId(templateData: TemplateData, fullyQualifiedProjectName: string): void {
    templateData.project.appId = fullyQualifiedProjectName;
}
