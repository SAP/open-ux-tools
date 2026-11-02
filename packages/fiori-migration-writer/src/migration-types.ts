import type { FioriElementsVersion, SapAppSourceTemplate } from './project-spec-types.js';
import type { MigrationTypes, postMigrationAction } from './utils/constants.js';
import type { CdsUi5PluginInfo, Manifest } from '@sap-ux/project-access';
import type { ODataVersion } from '@sap-ux/axios-extension';
import type { Editor } from 'mem-fs-editor';
import type { CapService as BaseCapService } from '@sap-ux/cap-config-writer';

// Import types from shared packages - DO NOT re-export
// Import directly from the source package where you need them
import type {
    BasePackageJsonConfig,
    BaseProjectConfig,
    BaseServiceConfig,
    CapRuntime
} from '@sap-ux/fiori-generator-shared';

// Re-export ProjectFolder interface for abstraction from VS Code
export type { ProjectFolder } from './types/project-folder.js';
export { isProjectFolderArray } from './types/project-folder.js';

/**
 * Package.json configuration for migration.
 *
 * Extends BasePackageJsonConfig. Migration allows all start commands to be optional.
 */
export interface PackageJson extends BasePackageJsonConfig {}

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

// Import and re-export TemplateType from fiori-elements-writer (single source of truth)
export { TemplateType } from '@sap-ux/fiori-elements-writer';

/**
 * Legacy floor plan constants for backward compatibility with tools-suite
 *
 * @deprecated Use TemplateType from @sap-ux/fiori-elements-writer instead
 *
 * These map to the old V2/V4-specific floor plan identifiers.
 * Must remain exported for tools-suite (@sap/ux-app-migrator) backward compatibility.
 * SonarCloud deprecation warnings are expected and acceptable.
 */
// sonar-disable-next-block typescript:S1874
export const FLOOR_PLAN = {
    WorklistV2: 'V2_WORKLIST',
    ListReportObjectPageV2: 'V2_LIST_REPORT',
    AnalyticalListPageV2: 'V2_ANALYTICAL',
    ListReportObjectPageV4: 'V4_LIST_REPORT',
    OverviewPageV2: 'V2_OVERVIEW'
} as const;
// sonar-disable-next-line typescript:S1874
export type FloorPlan = (typeof FLOOR_PLAN)[keyof typeof FLOOR_PLAN];

/**
 * Legacy project type constants for backward compatibility with tools-suite
 *
 * @deprecated Use FLOOR_PLAN instead (they are identical)
 *
 * Must remain exported for tools-suite backward compatibility.
 * SonarCloud deprecation warning is expected and acceptable.
 */
// sonar-disable-next-line typescript:S1874
export const PROJECT_TYPE = FLOOR_PLAN;

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
// Consolidate when app-gen-core types are published to @sap-ux scope - track in package migration roadmap
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

/**
 * Project configuration for Fiori migration.
 *
 * Extends BaseProjectConfig with migration-specific properties.
 */
export interface Project extends BaseProjectConfig {
    /** Whether to enable code assist features */
    enableCodeAssist: boolean;

    /** Whether to enable ESLint (required for migration) */
    enableEslint: boolean;

    /** Whether to enable TypeScript (required for migration) */
    enableTypeScript: boolean;

    /** Manifest version */
    manifestVersion: string;

    /** Whether to enable NPM workspaces */
    enableNPMWorkspaces?: boolean;
}

/**
 * User credentials for authentication.
 *
 * NOTE: This interface is duplicated across multiple @sap-ux packages:
 * - @sap-ux/abap-deploy-config-inquirer
 * - @sap-ux/fiori-app-sub-generator
 * - @sap-ux/fiori-migration-writer (this package)
 * - @sap-ux/generator-adp
 * Additionally, @sap-ux/system-access exports BasicAuth as a similar type.
 *
 * A shared @sap-ux/auth-types package would eliminate this duplication,
 * but would require coordinating changes across all consuming packages.
 * For now, each package maintains its own Credentials interface to avoid
 * circular dependencies and maintain independence.
 *
 * SECURITY: This interface contains sensitive authentication data.
 * The `password` field must NEVER be logged, included in error messages,
 * or transmitted to telemetry systems.
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

/**
 * CAP service configuration for migration.
 *
 * Extends base CapService from cap-config-writer with migration-specific properties.
 */
export interface CapService extends BaseCapService {
    /** Optional custom CAP app folder */
    appPath?: string;

    /** Relative path to cap service cds file */
    serviceCdsPath?: string;

    /** CAP implementation type */
    capType?: CapRuntime;

    /** Has min @sap/cds version, NPM Workspaces and cds plugin configured */
    capCdsInfo?: CdsUi5PluginInfo;
}

/**
 * Service configuration for migration.
 *
 * Extends BaseServiceConfig with migration-specific properties.
 */
export interface Service extends Omit<BaseServiceConfig, 'source'> {
    /** Service host (required for migration) */
    host: string;

    /** Whether this is a SAP Cloud Platform service */
    scp?: boolean;

    /** Destination name */
    destination?: string;

    /** Destination instance */
    destinationInstance?: string;

    /** EDMX metadata (required for migration) */
    edmx: string;

    /** CAP service configuration */
    capService?: CapService;

    /** Data source type - uses migration-specific DatasourceType */
    source: DatasourceType;
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
