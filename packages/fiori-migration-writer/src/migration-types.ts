import type { FioriElementsVersion, SapAppSourceTemplate, Manifest } from './project-spec-types.js';
import type { MigrationTypes, postMigrationAction } from './utils/constants.js';
import type { UI5FlexLayer } from '@sap-ux/project-access';
import type { ODataVersion } from '@sap-ux/axios-extension';
import type { BaseProject, BaseService } from '@sap-ux/fiori-generator-shared';
import type { MemFsEditor as Editor } from 'mem-fs-editor';

// Re-export ProjectFolder interface for abstraction from VS Code
export type { ProjectFolder } from './types/project-folder.js';
export { isProjectFolderArray } from './types/project-folder.js';

/**
 * package.json script entries (commands and tasks)
 */
export type Script = {
    name: string;
    command: string;
};

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
    sapuxLayer?: UI5FlexLayer;
}

// Common constants defs used throughout
export const DatasourceType = {
    FILE: 'File',
    URL: 'OData Url',
    CAP: 'Local Cap',
    SAP_SYSTEM: 'SAP System',
    API_HUB: 'SAP Business Accelerator Hub',
    MTA_FILE: 'MTA File',
    NONE: 'None'
} as const;
export type DatasourceType = (typeof DatasourceType)[keyof typeof DatasourceType];

// Use string literals to avoid bundling issues with computed property keys
export const FLOOR_PLAN = {
    WorklistV2: 'V2_WORKLIST',
    ListReportObjectPageV2: 'V2_LIST_REPORT',
    AnalyticalListPageV2: 'V2_ANALYTICAL',
    ListReportObjectPageV4: 'V4_LIST_REPORT',
    OverviewPageV2: 'V2_OVERVIEW'
} as const;
export type FloorPlan = (typeof FLOOR_PLAN)[keyof typeof FLOOR_PLAN];

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

export interface EntityConfig {
    mainEntity?: { entityName: string; type?: any };
    filterEntityType?: string;
    navigationEntity?: {
        EntitySet: string;
        Name: string;
        Role?: string;
    };
}

export interface ProjectMigrate extends BaseProject {
    enableCodeAssist: boolean;
    enableEslint: boolean;
    enableTypeScript: boolean;
    manifestVersion: string;
    enableNPMWorkspaces?: boolean;
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
}
export interface PackageJsonMigrate extends Omit<PackageJson, 'devDependencies'> {
    pointToIndexHtml?: boolean;
    devDependencies:
        | {
              [key: string]: string;
          }
        | string; // NOTE: string type needed for Freestyle projects with non-standard devDependencies format. Remove when Freestyle generator normalizes devDependencies format
    hasDataSource: boolean;
}
export const neoAppJsonRouteTargetTypes = {
    application: 'application',
    destination: 'destination'
} as const;
export type neoAppJsonRouteTargetTypes = (typeof neoAppJsonRouteTargetTypes)[keyof typeof neoAppJsonRouteTargetTypes];

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

export const TemplateDataKey = {
    project: 'project',
    service: 'service',
    ui5Yaml: 'ui5Yaml',
    packageJson: 'packageJson'
} as const;
export type TemplateDataKey = (typeof TemplateDataKey)[keyof typeof TemplateDataKey];
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

/**
 * User credentials for authentication.
 *
 * SECURITY: This interface contains sensitive authentication data.
 * The `password` field must NEVER be logged, included in error messages,
 * or transmitted to telemetry systems.
 *
 * @deprecated Not used by the migration writer. Will be removed in a future release.
 */
export interface Credentials {
    /** Username for authentication */
    username: string;
    /**
     * Password for authentication.
     *
     * SECURITY: NEVER log this value, include in error messages, or store in plain text.
     * Handle with care and clear from memory when no longer needed.
     */
    password?: string;
}
export const CapType = {
    NODE_JS: 'Node.js',
    JAVA: 'Java'
} as const;
export type CapType = (typeof CapType)[keyof typeof CapType];
export const SapSystemSourceType = {
    SCP: 'SCP',
    ON_PREM: 'ON_PREM',
    S4HC: 'S4HC'
} as const;
export type SapSystemSourceType = (typeof SapSystemSourceType)[keyof typeof SapSystemSourceType];

export interface Service extends BaseService {
    host: string;
    scp?: boolean;
    destination?: string;
    destinationInstance?: string;
    edmx: string;
    version?: ODataVersion; // Not present for FF no datasource template flow
    source: DatasourceType;
    sapSystemSource?: SapSystemSourceType; // Only used by README
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
    ui5SnapshotUrl?: string;
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
    fs: Editor;
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
    getPackageJson: (projectRoot: string) => any;
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
    getFirstBackend: (projectRoot: string) => {
        url?: string;
        destination?: string;
        scp?: boolean;
        sapClient?: string;
    };
    getFlpIntentFromHtml: (path: string) => string | undefined;
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
    fs: Editor;
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
