import type { FioriElementsVersion, SapAppSourceTemplate, Manifest } from './project-spec-types.js';
import type { MigrationTypes, postMigrationAction } from './utils/constants.js';
import type { CdsUi5PluginInfo } from '@sap-ux/project-access';
import type { Annotations } from '@sap-ux/axios-extension';

// Re-export ProjectFolder interface for abstraction from VS Code
export type { ProjectFolder } from './types/project-folder.js';
export { isProjectFolderArray } from './types/project-folder.js';

/**
 * OData versions supported by the catalog service
 */
export enum ODataVersion {
    v2 = '2',
    v4 = '4'
}
/**
 * package.json script entries (commands and tasks)
 */
export type Script = {
    name: string;
    command: string;
};

export enum SapUxLayer {
    VENDOR = 'VENDOR',
    CUSTOMER_BASE = 'CUSTOMER_BASE'
}

/** package.json interface */
export interface PackageJson {
    name: string;
    description: string;
    startCommand?: string;
    startLocalCommand?: string;
    startNoFlpCommand?: string;
    startVariantsCommand?: string;
    addMockCommand?: boolean;
    sapClientParam?: string;
    flpAppId?: string; // Identifies the application in FLP => SemanticObject-Action
    devDependencies: {
        [key: string]: string;
    };
    ui5Dependencies: string[];
    sapux?: boolean;
    startFile?: string; // relative path to start html
    localStartFile?: string; // relative path to local start html
    runTasks?: Script[];
    enableEslint: boolean;
    sapuxLayer?: SapUxLayer;
}

// Common constants defs used throughout
export const enum DatasourceType {
    FILE = 'File',
    URL = 'OData Url',
    CAP = 'Local Cap',
    SAP_SYSTEM = 'SAP System',
    API_HUB = 'SAP Business Accelerator Hub',
    MTA_FILE = 'MTA File',
    NONE = 'None'
}

// Use string literals to avoid bundling issues with computed property keys
export const FLOOR_PLAN = {
    WorklistV2: 'V2_WORKLIST',
    ListReportObjectPageV2: 'V2_LIST_REPORT',
    AnalyticalListPageV2: 'V2_ANALYTICAL',
    ListReportObjectPageV4: 'V4_LIST_REPORT',
    OverviewPageV2: 'V2_OVERVIEW'
};

export type Backend = {
    source?: string;
    target?: string;
    type?: string;
    destination?: string;
};

export type NeoappDestination = {
    path: string;
    name: string;
    entryPath?: string;
};

export interface BackendConfig {
    path: string;
    url?: string;
    client?: string;
    destination?: string;
    destinationInstance?: string;
    pathPrefix?: string;
}

// NOTE: EntityConfig duplicates types from @sap-ux/app-gen-core
// Tracked in #38120 - Will be consolidated when app-gen-core types are published to @sap-ux scope
export interface EntityConfig {
    mainEntity?: { entityName: string; type?: any };
    filterEntityType?: string;
    navigationEntity?: {
        EntitySet: string;
        Name: string;
        Role?: string;
    };
}

export interface ProjectMigrate extends Project {
    flpAppId?: string; // Identifies the application in FLP => SemanticObject-Action will be used in html templates
    appId?: string;
    entityConfig?: EntityConfig;
    SemanticObject?: string;
    appMigratorSrcComponentToReplace?: string;
    mainDataSource?: string;
    mainDatasourceName?: string;
    // escapeDoubleQuotes?: Function;
    projectTitle?: string;
    projectDescription?: string;
    fullyQualifiedProjectName?: string;
    fullyQualifiedProjectNameAMD?: string;
    sapUiLibs?: string;
    minSupportedUI5Version?: string;
    manifestUI5Version?: string;
    neoAppUI5Version?: string;
    semanticObject: string;
    type?: MigrationTypes;
    extenstionSettings?: any;
}
export interface PackageJsonMigrate extends Omit<PackageJson, 'devDependencies'> {
    pointToIndexHtml?: boolean;
    devDependencies:
        | {
              [key: string]: string;
          }
        | string; // NOTE: string type needed for Freestyle projects with non-standard devDependencies format. Tracked in #38121 - Will be removed when Freestyle generator is updated
    hasDataSource: boolean;
}
export enum neoAppJsonRouteTargetTypes {
    application = 'application',
    destination = 'destination'
}

export type HasRootIntent = {
    flpSandboxRootIntent?: boolean;
    flpSandboxMockRootIntent?: boolean;
};

export type ImportProjectInfo = {
    sapLibs: string;
    rootPath: string;
    moduleName: string;
    moduleDescription: string;
    mainServiceURI?: string;
    sapux: boolean;
    scp: boolean;
    destination: string;
    appTitle: string;
    appVersion: string;
    sapClient: string;
    backends: Backend[];
    FEVersion?: FioriElementsVersion;
    floorPlan?: string;
    namespace?: string;
    baseUri?: string;
    mainService?: string;
    mainServiceFsPath?: string;
    odataVersion: ODataVersion;
    mainEntity?: string;
    ui5Theme?: string;
    ui5Version?: string;
    localUI5Version?: string;
    isSAPApp?: boolean;
    webappPath: string;
    hostname: string;
    isFioriToolsProject: boolean;
    uiAdaptation?: any;
    minUI5Version?: string;
    supportedThemes?: string[];
    flpSandboxFlpIntent?: string;
    flpSandboxMockFlpIntent?: string;
    minSupportedUI5Version?: string;
    manifestUI5Version?: string;
    neoAppUI5Version?: string;
    neoappDestinations?: NeoappDestination[];
    sourceTemplate?: SapAppSourceTemplate; // Test only property
    firstNeoAppDestination?: string;
    type?: MigrationTypes;
    hasRootIntent?: HasRootIntent;
    extensionProjectSettings?: any;
    reuseLibs?: string;
    // if flpSandboxMockServer.html is found in the project, this will be set to 'test/flpSandboxMockServer.html'
    targetMockHtmlFile?: string;
};

export interface MigrationUIProjectInfo extends ImportProjectInfo {
    status?: 'ERROR' | 'WARNING' | 'SUCCESS';
    messages?: Message[];
    migrationTime?: number;
}
export interface ProjectAppPath {
    label: string;
    description: string;
}

export interface Message {
    type: 'ERROR' | 'WARNING' | 'SUCCESS';
    description: string;
    messageUrl?: string;
    action?: postMigrationAction;
}

export enum TemplateDataKey {
    project = 'project',
    service = 'service',
    ui5Yaml = 'ui5Yaml',
    packageJson = 'packageJson'
}
export type TemplateProperties = {
    path?: string;
    targetPath?: string;
    isRendered?: boolean; // Default true
    targetName?: string; // i.e. .gitignore.txt but written as .gitignore

    opts?: any;
    templateDataKey?: TemplateDataKey;
};

export type TemplateMap = {
    [key: string]: TemplateProperties;
};

export interface TemplateData<P extends ProjectMigrate = ProjectMigrate, S extends Service = Service> {
    project: Partial<P>;
    service: Partial<S>;
    readMe?: Partial<ReadMe>; // Customisation point for readme.txt
    ui5Yaml?: Partial<Ui5Yaml> & Partial<Ui5MockYaml>; // Customisation point for ui5Yaml
    packageJson?: Partial<PackageJsonMigrate>; // Customisation point for package.json
    appId?: string;
    SemanticObject?: string;
    escapeDoubleQuotes?: (input: string) => string;
    fullyQualifiedProjectName?: string;
    fullyQualifiedProjectNameAMD?: string;
    sapUiLibs?: string;
    ui5Theme?: string;
    appIntent?: string;
    appMockIntent?: string;
    mainServiceFsPath?: string;
    hasRootIntent?: HasRootIntent;
    mockServerJSFileName?: string;
}

export type MigrationSettingsFile = {
    ignoreProjects: string[];
};

export type MigratableFolder = {
    root: string;
    type: MigrationTypes;
    libPath?: string;
};

export const sapWattCommonSetting = 'sap.watt.common.setting';

export interface Project {
    targetFolder: string;
    addDeployConfig?: boolean;
    addFlpConfig?: boolean;
    name: string;
    namespace?: string;
    title: string;
    description: string;
    ui5Theme: string;
    ui5Version: string;
    ui5FrameworkUrl?: string; // URL providing ui5 libraries, set to default if not provided
    localUI5Version: string;
    sapux?: boolean;
    skipAnnotations?: boolean;
    enableCodeAssist: boolean;
    enableEslint: boolean;
    enableTypeScript: boolean;
    manifestVersion: string;
    formEntry?: boolean;
    flpAppId?: string; // Represents the concatentation of sematicObject and action to form a navigation intent as used in url http://some/path#<semanticObject>-<action>
    minSupportedUI5Version?: string; // min supported version based on floorplan and odata version
    manifestMinUI5Version?: string; // ui5 version for manifest.json minUI5Version,
    enableNPMWorkspaces?: boolean;
}

export interface Credentials {
    username: string;
    password?: string;
}
export enum CapType {
    NODE_JS = 'Node.js',
    JAVA = 'Java'
}
export const enum ApiHubType {
    apiHub = 'API_HUB',
    apiHubEnterprise = 'API_HUB_ENTERPRISE'
}
/**
 * Defines the api hub service properties or enterprise and non-enterprise versions
 */
export interface ApiHubConfig {
    apiHubKey: string;
    apiHubType: ApiHubType;
}

export interface CapService {
    projectPath: string; // The CAP Project Root
    serviceName: string;
    appPath?: string; // Optional custom CAP app folder
    serviceCdsPath?: string; // relative path to cap service cds file
    capType?: CapType; // CAP implementation type,
    capCdsInfo?: CdsUi5PluginInfo; // Has min @sap/cds version, NPM Workspces and cds plugin configured
}

export const enum SapSystemSourceType {
    SCP = 'SCP',
    ON_PREM = 'ON_PREM',
    S4HC = 'S4HC'
}

export interface Service {
    host: string;
    client?: string;
    scp?: boolean;
    destination?: string;
    destinationInstance?: string;
    servicePath?: string; // url path of odata or cap service
    edmx: string;
    annotations?: Annotations[];
    version?: ODataVersion; // Not present for FF no datasource template flow
    capService?: CapService;
    source: DatasourceType;
    sapSystemSource?: SapSystemSourceType; // Only used by README
    localEdmxFilePath?: string; // Only used by README
    destinationAuthType?: string;
    apiHubConfig?: ApiHubConfig;
    ignoreCertError?: boolean;
}

/** README.txt base definition */
export interface ReadMe {
    genDate: string;
    genPlatform: string;
    dataSourceLabel: string;
    metadataFilename?: string;
    serviceUrl: string;
    projectName: string;
    projectTitle: string;
    projectNamespace: string;
    projectDescription: string;
    ui5Theme: string;
    projectUI5Version: string;
    enableCodeAssist: boolean;
    enableEslint: boolean;
    enableTypeScript: boolean;
    showMockDataInfo?: boolean;
    genId: string;
    genVersion: string;
    templateLabel: string; // The template/floorplan selected
    additionalEntries?: { label: string; value: string }[]; // Read me line entries
    launchText?: string;
}

// Note that only ui5 properties supported by middleware proxy should go here
// For example, ui5Theme must not
interface Ui5YamlProps {
    ui5Version: string;
    ui5Url: string;
}
export interface Ui5Yaml extends Ui5YamlProps {
    name: string;
    proxyPath: string;
    proxyHost: string;
    scp?: boolean;
    destination?: string;
    destinationInstance?: string;
    ui5Theme: string;
    localUI5Version: string;
    sapUiLibs: string[];
    apiHubApiKey?: string;
    client?: string;
    appId?: string;
}

// Represents contents of mock middleware yaml entry
export interface Ui5MockYaml extends Ui5YamlProps {
    name: string;
    servicePath: string;
    serviceName?: string;
    metadataXmlPath: string;
    mockdataRootPath: string;
    generateMockData: boolean;
}

// Configuration interfaces for refactored parameter-heavy functions

/**
 * UI5 configuration options for YAML generation
 */
export interface UI5ConfigOptions {
    projectUI5Version: string;
    localUI5Version?: string;
    ui5Version?: string;
    ui5Theme: string;
    ui5SnapshotUrl: string;
    ui5VersionRequestInfo: any;
}

/**
 * Backend/proxy configuration options
 */
export interface BackendConfigOptions {
    baseUri?: string;
    scp?: boolean;
    destination: string;
    sapClient?: string;
}

/**
 * Library configuration for UI5 YAML
 */
export interface LibraryConfigOptions {
    sapLibs: string;
    baseUiLibsStr?: string;
    supportedThemes?: string[];
}

/**
 * Context for createUi5YamlConfig function
 */
export interface Ui5YamlContext {
    projectInfo: ImportProjectInfo;
    moduleName: string;
    fullyQualifiedProjectName: string;
    ui5Config: UI5ConfigOptions;
    backendConfig: BackendConfigOptions;
    libraryConfig: LibraryConfigOptions;
}

/**
 * Dependency configuration for package.json generation
 */
export interface PackageJsonDependencies {
    devDependencies: any;
    ui5Dependencies: string[];
    v4MockServerDep: any;
}

/**
 * FLP (Fiori Launchpad) configuration for package.json
 */
export interface FLPConfiguration {
    semanticObject: string;
    appIntent: string;
    appMockIntent?: string;
    flpSandboxAvailable: boolean;
    testFlpSandboxHtml: string;
    urlParam: string;
    variantCmdUrlParam: string;
}

/**
 * Feature flags for package.json generation
 */
export interface PackageJsonFeatureFlags {
    isSAPApp: boolean;
    internalToggle: boolean;
    hasDataSource: boolean;
    keepIndex: boolean;
    floorPlan: string;
    odataVersion: string;
}

/**
 * Context for generatePackageJsonConfig function
 */
export interface PackageJsonContext {
    projectInfo: ImportProjectInfo;
    moduleName: string;
    moduleDescription: string;
    sapClient: string;
    dependencies: PackageJsonDependencies;
    flpConfig: FLPConfiguration;
    flags: PackageJsonFeatureFlags;
}

/**
 * Feature flags for template assembly
 */
export interface TemplateAssemblyFlags {
    keepIndex: boolean;
    internalToggle: boolean;
    hasRootIntent?: HasRootIntent;
    floorPlan?: string;
}

/**
 * Configuration data for template assembly (semantic object, naming, styling)
 */
export interface TemplateConfigData {
    semanticObject: string;
    fullyQualifiedProjectName: string;
    fullyQualifiedProjectNameAMD: string;
    sapUiLibs: string;
    ui5Theme: string;
    projectUI5Version: string;
    baseUiLibsStr: string;
    supportedThemes: string[];
    sapClientParam: string;
}

/**
 * Module information for template assembly
 */
export interface TemplateModuleInfo {
    moduleName: string;
    moduleDescription: string;
    destination: string;
}

/**
 * Context for assembleTemplateData function
 */
export interface TemplateAssemblyContext {
    projectInfo: ImportProjectInfo;
    rootPath: string;
    projectData: any;
    serviceData: any;
    config: TemplateConfigData;
    moduleInfo: TemplateModuleInfo;
    ui5Config: UI5ConfigOptions;
    backendConfig: BackendConfigOptions;
    libraryConfig: LibraryConfigOptions;
    flags: TemplateAssemblyFlags;
}

/**
 * Service for project data operations (package.json, entities, UI5 tooling)
 */
export interface ProjectDataService {
    getPackageJson: (projectRoot: string) => Promise<any>;
    getMainEntity: (manifest: Manifest) => string;
    hasUI5Tooling: (packageJson: any) => boolean;
}

/**
 * Service for manifest analysis operations (semantic objects, versions, floor plans)
 */
export interface ManifestAnalysisService {
    getSemanticObjectAction: (manifest: Manifest) => string | undefined;
    getVersionFromManifest: (manifest: Manifest) => FioriElementsVersion | undefined;
    getFloorPlan: (manifest: Manifest, feVersion: FioriElementsVersion | undefined) => string;
}

/**
 * Service for backend configuration operations (backends, intents, destinations, clients)
 */
export interface BackendConfigService {
    getFirstBackend: (projectRoot: string) => Promise<
        | {
              url?: string;
              destination?: string;
              scp?: boolean;
              sapClient?: string;
          }
        | undefined
    >;
    getFlpIntentFromHtml: (path: string) => Promise<string | undefined>;
    getDestinationFromNeoApp: (
        projectRoot: string,
        destination: string
    ) => Promise<
        | {
              destination?: string;
              neoAppUI5Version?: string;
              neoappDestinations?: NeoappDestination[];
          }
        | undefined
    >;
    getClientFromDestinationName: (destination: string) => string;
}

/**
 * Context for processRegularProject function
 */
export interface RegularProjectContext {
    projectRoot: string;
    manifest: Manifest;
    defaultProjectInfo: ImportProjectInfo;
    projectInfo: ImportProjectInfo;
    services: {
        projectData: ProjectDataService;
        manifestAnalysis: ManifestAnalysisService;
        backendConfig: BackendConfigService;
    };
}
